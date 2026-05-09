import { useRouter } from "next/router";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthorizeCallbackMutation } from "@/features/auth/queries/auth.queries";

export default function AuthCallbackPage() {
  const router = useRouter();
  const callbackMutation = useAuthorizeCallbackMutation();
  const code = typeof router.query.code === "string" ? router.query.code : null;
  const state =
    typeof router.query.state === "string" ? router.query.state : null;

  useEffect(() => {
    if (!router.isReady || !code || !state || callbackMutation.isPending) {
      return;
    }

    callbackMutation.mutate(
      { code, state },
      {
        onSuccess: () => {
          void router.replace("/");
        },
      },
    );
  }, [callbackMutation, code, router, state]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Completing sign in</CardTitle>
        </CardHeader>
        <CardContent>
          {callbackMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>
                Your sign-in could not be completed. Sign in again.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              Finishing sign in.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
