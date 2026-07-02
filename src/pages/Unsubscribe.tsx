import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json();
        if (!res.ok) {
          setState("invalid");
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setState("already");
        } else if (data.valid === true) {
          setState("valid");
        } else {
          setState("invalid");
        }
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setState("error");
      } else if (data?.success) {
        setState("success");
      } else if (data?.reason === "already_unsubscribed") {
        setState("already");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full card-premium">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MailX className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Désabonnement</CardTitle>
          <CardDescription>Gestion de vos préférences email</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Vérification du lien...</p>
            </div>
          )}
          {state === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirmez le désabonnement pour ne plus recevoir d'emails de dicadecor.
              </p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer le désabonnement"}
              </Button>
            </>
          )}
          {state === "success" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm">Vous avez été désabonné avec succès.</p>
            </div>
          )}
          {state === "already" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm">Cette adresse est déjà désabonnée.</p>
            </div>
          )}
          {state === "invalid" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm">Lien invalide ou expiré.</p>
            </div>
          )}
          {state === "error" && (
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm">Une erreur est survenue. Réessayez plus tard.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
