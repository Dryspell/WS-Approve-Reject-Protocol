import { Component, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Button } from "../ui/button";
import { TextField, TextFieldInput } from "../ui/text-field";
import { login } from "~/stores/auth";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";

const LoginPage: Component = () => {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email(), password());
      
      showToast({
        title: "Success",
        description: "Successfully logged in",
        variant: "success",
        duration: DEFAULT_TOAST_DURATION,
      });

      navigate("/");
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to login",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center">
      <div class="w-full max-w-md space-y-8 rounded-lg border p-6 shadow-lg">
        <div class="text-center">
          <h2 class="text-3xl font-bold">Welcome back</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Please sign in to your account
          </p>
        </div>

        <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div class="space-y-4">
            <TextField>
              <TextFieldInput
                type="email"
                placeholder="Email address"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                required
              />
            </TextField>

            <TextField>
              <TextFieldInput
                type="password"
                placeholder="Password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                required
              />
            </TextField>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-sm">
              <a href="/register" class="text-primary hover:underline">
                Don't have an account? Register
              </a>
            </div>
          </div>

          <Button
            type="submit"
            class="w-full"
            disabled={isLoading()}
          >
            {isLoading() ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage; 