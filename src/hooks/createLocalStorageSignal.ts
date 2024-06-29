import { createEffect, createSignal } from "solid-js";
import { JSONObject } from "~/types/utils";

const getLocalStorageValue = <T extends JSONObject>(
	key: string,
	defaultValue: T
) => {
	if (typeof window !== "undefined" && window.localStorage.getItem(key)) {
		const value = window.localStorage.getItem(key);
		if (value == null) {
			window.localStorage.setItem(key, JSON.stringify(defaultValue));
			return defaultValue;
		}
		try {
			return JSON.parse(value) as T | null;
		} catch (error) {
			// console.error(error);
			return null;
		}
	} else {
		return defaultValue;
	}
};

export const createLocalStorageSignal = <T extends JSONObject>(
	key: string,
	defaultValue: T
) => {
	const [value, setValue] = createSignal<T>(
		getLocalStorageValue(key, defaultValue) ?? defaultValue
	);

	createEffect(() => {
		window.localStorage.setItem(key, JSON.stringify(value()));
	});

	return [value, setValue] as const;
};
