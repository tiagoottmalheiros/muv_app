"use client";

import { ArrowUpRight, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";

function getInboxUrl(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();

  if (["gmail.com", "googlemail.com"].includes(domain ?? "")) return "https://mail.google.com/mail/u/0/#inbox";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain ?? "")) return "https://outlook.live.com/mail/0/";
  if (domain === "yahoo.com" || domain?.endsWith(".yahoo.com")) return "https://mail.yahoo.com/";
  if (["icloud.com", "me.com", "mac.com"].includes(domain ?? "")) return "https://www.icloud.com/mail/";

  return "https://outlook.office.com/mail/";
}

export function OpenPurchaseEmail() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function openInbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Informe um e-mail válido para abrir sua caixa de entrada.");
      return;
    }

    setError("");
    window.location.assign(getInboxUrl(normalizedEmail));
  }

  return (
    <form className="mt-5" onSubmit={openInbox}>
      <label className="block text-left text-xs font-bold text-muted" htmlFor="purchase-email">
        E-mail usado no pagamento
      </label>
      <input
        autoComplete="email"
        className="field mt-2"
        id="purchase-email"
        inputMode="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="voce@email.com"
        type="email"
        value={email}
      />
      {error && <p className="mt-2 text-left text-xs text-red-300">{error}</p>}
      <button className="button button-primary mt-3 w-full sm:w-auto" type="submit">
        <Mail size={17} />Abrir meu e-mail<ArrowUpRight size={17} />
      </button>
      <p className="mt-3 text-xs leading-5 text-muted">Abriremos a caixa de entrada do provedor desse endereço. Entre com esse mesmo e-mail, se necessário.</p>
    </form>
  );
}
