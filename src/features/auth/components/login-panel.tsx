import { LogInIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoginMutation } from "../queries/auth.queries";

export function LoginPanel() {
  const loginMutation = useLoginMutation();

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Doclane</CardTitle>
          <CardDescription>Sign in with your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed to start</AlertTitle>
              <AlertDescription>
                The sign-in page could not be opened. Try again.
              </AlertDescription>
            </Alert>
          ) : null}
          <Button
            onClick={() => loginMutation.mutate()}
            disabled={loginMutation.isPending}
          >
            <LogInIcon />
            Sign in
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
