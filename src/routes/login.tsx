import {
  useSubmission,
  type RouteSectionProps,
  type Action
} from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { loginOrRegister } from "./api/server";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

export default function Login(props: RouteSectionProps) {
  const loggingIn = useSubmission(loginOrRegister as Action<[FormData], Error, unknown>);
  const [loginType, setLoginType] = createSignal<"login" | "register">("login");

  return (
    <main class="mx-auto max-w-md p-4">
      <h1 class="mb-4 text-2xl font-bold">Login or Register</h1>
      <form action={loginOrRegister as Action<[FormData], Error, unknown>} method="post" class="space-y-4">
        <input type="hidden" name="redirectTo" value={props.params.redirectTo ?? "/"} />
        
        <div class="flex gap-4">
          <label class="flex items-center space-x-2">
            <input
              type="radio"
              name="loginType"
              value="login"
              checked={loginType() === "login"}
              onChange={(e) => setLoginType(e.currentTarget.value as "login" | "register")}
            />
            <span>Login</span>
          </label>
          <label class="flex items-center space-x-2">
            <input
              type="radio"
              name="loginType"
              value="register"
              checked={loginType() === "register"}
              onChange={(e) => setLoginType(e.currentTarget.value as "login" | "register")}
            />
            <span>Register</span>
          </label>
        </div>

        <div class="space-y-2">
          <Label for="username-input">Username</Label>
          <TextField class="w-full">
            <TextFieldInput
              id="username-input"
              name="username"
              type="text"
              placeholder="Enter your username"
              autocomplete="username"
              required
              minLength={3}
            />
          </TextField>
        </div>

        <Show when={loginType() === "register"}>
          <div class="space-y-2">
            <Label for="email-input">Email</Label>
            <TextField class="w-full">
              <TextFieldInput
                id="email-input"
                name="email"
                type="email"
                placeholder="Enter your email"
                autocomplete="email"
                required
              />
            </TextField>
          </div>
        </Show>

        <div class="space-y-2">
          <Label for="password-input">Password</Label>
          <TextField class="w-full">
            <TextFieldInput
              id="password-input"
              name="password"
              type="password"
              placeholder="Enter your password"
              autocomplete={loginType() === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
            />
          </TextField>
        </div>

        <Button type="submit" class="w-full">
          {loginType() === "login" ? "Login" : "Register"}
        </Button>

        <Show when={loggingIn.result}>
          <p class="text-red-500" role="alert" id="error-message">
            {loggingIn.result!.message}
          </p>
        </Show>
      </form>
    </main>
  );
}
