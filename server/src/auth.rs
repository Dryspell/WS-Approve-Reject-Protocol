use spacetimedb::{reducer, table, Identity, ReducerContext, Table, Timestamp};
use rand::Rng;

#[table(name = user, public)]
#[derive(Clone, Debug)]
pub struct User {
    #[primary_key]
    pub id: String,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub created_at: i64,
    pub last_login: i64,
    pub is_active: bool,
}

#[table(name = session, public)]
#[derive(Clone, Debug)]
pub struct Session {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    pub token: String,
    pub expires_at: i64,
    pub created_at: i64,
    pub last_activity: i64,
}

#[reducer]
pub fn register(ctx: ReducerContext, username: String, email: String, password_hash: String) -> String {
    let user_id = format!("user_{}", rand::thread_rng().gen::<u64>());
    User::insert(User {
        id: user_id.clone(),
        username,
        email,
        password_hash,
        created_at: Timestamp::now().as_millis(),
        last_login: Timestamp::now().as_millis(),
        is_active: true,
    });
    user_id
}

#[reducer]
pub fn create_session(ctx: ReducerContext, user_id: String, token: String) -> String {
    let session_id = format!("session_{}", rand::thread_rng().gen::<u64>());
    let now = Timestamp::now().as_millis();
    Session::insert(Session {
        id: session_id.clone(),
        user_id,
        token,
        expires_at: now + (24 * 60 * 60 * 1000), // 24 hours
        created_at: now,
        last_activity: now,
    });
    session_id
}

#[reducer]
pub fn update_last_login(ctx: ReducerContext, user_id: String) {
    if let Some(mut user) = User::find_by_id(&user_id) {
        user.last_login = Timestamp::now().as_millis();
        User::update(user);
    }
}

#[reducer]
pub fn update_session_activity(ctx: ReducerContext, session_id: String) {
    if let Some(mut session) = Session::find_by_id(&session_id) {
        session.last_activity = Timestamp::now().as_millis();
        Session::update(session);
    }
}

#[reducer]
pub fn delete_session(ctx: ReducerContext, session_id: String) {
    Session::delete_by_id(&session_id);
}

#[reducer]
pub fn cleanup_expired_sessions(ctx: ReducerContext) {
    let now = Timestamp::now().as_millis();
    for session in Session::iter() {
        if session.expires_at < now {
            Session::delete_by_id(&session.id);
        }
    }
} 