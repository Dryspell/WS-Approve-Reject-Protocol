use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, Url, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

const SITE: &str = "http://127.0.0.1:3001/vote";
const DEEP_LINK_SCHEME: &str = "nashfall";

fn site() -> Url {
    Url::parse(SITE).expect("SITE is a valid URL")
}

fn same_origin(url: &Url) -> bool {
    url.origin() == site().origin()
}

/// Turns `nashfall://open?to=/some/path` into `/some/path`, refusing anything off SITE.
fn deep_link_path(url: &Url) -> Option<String> {
    if url.scheme() != DEEP_LINK_SCHEME || url.host_str() != Some("open") {
        return None;
    }
    let to = url.query_pairs().find(|(key, _)| key == "to")?.1.into_owned();
    let target = site().join(&to).ok()?;
    (to.starts_with('/') && same_origin(&target)).then_some(to)
}

fn open_external(app: &AppHandle, url: &Url) {
    let _ = app.opener().open_url(url.as_str(), None::<&str>);
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn open_in_main(app: &AppHandle, path: &str) {
    if let (Some(window), Ok(url)) = (app.get_webview_window("main"), site().join(path)) {
        let _ = window.navigate(url);
    }
    show_main(app);
}

/// The window starts on the bundled launcher page, which waits for SITE to answer
/// and then hands off to it at `start`.
fn create_main_window(app: &AppHandle, start: &str) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
        .cloned()
        .expect("tauri.conf.json defines the main window");
    let shell = serde_json::json!({
        "name": app.package_info().name,
        "site": SITE,
        "start": start,
    });
    let script = format!(
        "if (location.hostname === 'tauri.localhost' || location.protocol === 'tauri:') window.__SHELL__ = {shell};"
    );
    let popup_app = app.clone();
    let navigation_app = app.clone();
    WebviewWindowBuilder::from_config(app, &config)?
        .initialization_script(script)
        .on_new_window(move |url, _features| {
            if same_origin(&url) {
                return NewWindowResponse::Allow;
            }
            open_external(&popup_app, &url);
            NewWindowResponse::Deny
        })
        .on_navigation(move |url| match url.scheme() {
            "http" | "https" | "tauri" | "about" | "data" | "blob" => true,
            _ => {
                open_external(&navigation_app, url);
                false
            }
        })
        .build()?;
    Ok(())
}

#[cfg(not(debug_assertions))]
mod updates {
    use tauri::AppHandle;
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
    use tauri_plugin_updater::{Update, UpdaterExt};

    pub fn check_in_background(app: AppHandle) {
        tauri::async_runtime::spawn(async move {
            match check(&app).await {
                Ok(Some(update)) => prompt(app, update),
                Ok(None) => {}
                Err(error) => eprintln!("update check failed: {error}"),
            }
        });
    }

    async fn check(app: &AppHandle) -> tauri_plugin_updater::Result<Option<Update>> {
        app.updater()?.check().await
    }

    fn prompt(app: AppHandle, update: Update) {
        let message = format!(
            "{} {} is available. You have {}.",
            app.package_info().name,
            update.version,
            update.current_version
        );
        app.dialog()
            .message(message)
            .title("Update available")
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Install and restart".into(),
                "Later".into(),
            ))
            .show(move |install| {
                if !install {
                    return;
                }
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = update.download_and_install(|_, _| {}, || {}).await {
                        app.dialog()
                            .message(format!("The update could not be installed: {error}"))
                            .title("Update failed")
                            .kind(MessageDialogKind::Error)
                            .show(|_| {});
                        return;
                    }
                    app.restart();
                });
            });
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first so a second launch only focuses this one.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app)
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Installed builds get the scheme from the installer; dev builds register it here.
            #[cfg(debug_assertions)]
            app.deep_link().register_all()?;

            let start = app
                .deep_link()
                .get_current()?
                .unwrap_or_default()
                .iter()
                .find_map(deep_link_path)
                .unwrap_or_else(|| site().path().to_owned());
            create_main_window(app.handle(), &start)?;

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(path) = event.urls().iter().find_map(deep_link_path) {
                    open_in_main(&handle, &path);
                }
            });

            #[cfg(not(debug_assertions))]
            updates::check_in_background(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the desktop app");
}
