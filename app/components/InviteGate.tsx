import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAccount, useWalletConnector } from "@orderly.network/hooks";
import { CheckCircle2, KeyRound, Loader2, Lock, Wallet } from "lucide-react";
import { fetchPointsJson } from "@/utils/points-api";

type InviteBindingResponse = {
  bound: boolean;
  address: string;
  inviteCode?: string;
  boundAt?: string;
};

type GateState = "idle" | "checking" | "bound" | "unbound" | "error" | "binding";

const inviteCodeLength = 6;
const verifiedInviteAddresses = new Set<string>();

export function InviteGate({
  children,
  onLockedChange
}: {
  children: ReactNode;
  onLockedChange?: (locked: boolean) => void;
}) {
  const { account } = useAccount();
  const walletConnector = useWalletConnector();
  const address = account.address ?? "";
  const normalizedAddress = normalizeAddress(address);
  const isAddressVerified = normalizedAddress ? verifiedInviteAddresses.has(normalizedAddress) : false;
  const [gateState, setGateState] = useState<GateState>(isAddressVerified ? "bound" : "idle");
  const [boundAddress, setBoundAddress] = useState(isAddressVerified ? address : "");
  const [code, setCode] = useState<string[]>(Array(inviteCodeLength).fill(""));
  const [message, setMessage] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const inviteCode = useMemo(() => code.join(""), [code]);
  const isBoundForAddress =
    gateState === "bound" && normalizeAddress(boundAddress) === normalizedAddress;
  const canEditCode = Boolean(address) && gateState === "unbound";
  const canBind = canEditCode && inviteCode.length === inviteCodeLength;
  const isBusy = gateState === "checking" || gateState === "binding";

  useEffect(() => {
    setCode(Array(inviteCodeLength).fill(""));
    setMessage("");
    setBoundAddress("");

    if (!address) {
      setGateState("idle");
      return;
    }

    if (verifiedInviteAddresses.has(normalizedAddress)) {
      setGateState("bound");
      setBoundAddress(address);
      return;
    }

    void checkInviteBinding(address);
  }, [address, normalizedAddress]);

  useEffect(() => {
    if (!address) {
      onLockedChange?.(true);
      return;
    }

    if (gateState === "idle" || gateState === "checking") {
      return;
    }

    onLockedChange?.(!isBoundForAddress);
  }, [address, gateState, isBoundForAddress, onLockedChange]);

  if (isBoundForAddress) {
    return children;
  }

  async function checkInviteBinding(nextAddress: string) {
    try {
      setGateState("checking");
      const response = await fetchPointsJson<InviteBindingResponse>(
        `/points-api/invite-bindings/${nextAddress}`
      );

      setGateState(response.bound ? "bound" : "unbound");
      if (response.bound) {
        verifiedInviteAddresses.add(normalizeAddress(nextAddress));
      }
      setBoundAddress(response.bound ? nextAddress : "");
      setMessage(response.bound ? "Invite verified." : "Enter your invite code to unlock Vanta.");
    } catch (error) {
      setGateState("error");
      setBoundAddress("");
      setMessage(error instanceof Error ? error.message : "Failed to check invite binding.");
    }
  }

  async function bindInviteCode() {
    if (!address || !canBind) {
      return;
    }

    try {
      setGateState("binding");
      const response = await fetchPointsJson<InviteBindingResponse>("/points-api/invite-bindings", {
        method: "POST",
        body: JSON.stringify({
          address,
          inviteCode
        })
      });

      setGateState(response.bound ? "bound" : "unbound");
      if (response.bound) {
        verifiedInviteAddresses.add(normalizeAddress(address));
      }
      setBoundAddress(response.bound ? address : "");
      setMessage(response.bound ? "Invite verified." : "Invite code was not bound.");
    } catch (error) {
      setGateState("unbound");
      setBoundAddress("");
      setMessage(error instanceof Error ? error.message : "Failed to bind invite code.");
    }
  }

  function connectWallet() {
    void walletConnector.connect();
  }

  function updateCode(index: number, value: string) {
    const nextValue = sanitizeCode(value);
    const nextCode = [...code];

    if (nextValue.length > 1) {
      for (let offset = 0; offset < inviteCodeLength - index; offset += 1) {
        nextCode[index + offset] = nextValue[offset] ?? "";
      }

      setCode(nextCode);
      inputRefs.current[Math.min(index + nextValue.length, inviteCodeLength - 1)]?.focus();
      return;
    }

    nextCode[index] = nextValue;
    setCode(nextCode);

    if (nextValue && index < inviteCodeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key !== "Backspace" || code[index]) {
      return;
    }

    inputRefs.current[index - 1]?.focus();
  }

  return (
    <div className="invite-gate">
      <section className="invite-panel">
        <div className="invite-icon">
          <Lock size={28} />
        </div>
        <div className="invite-copy">
          <span>Invite required</span>
          <h1>Unlock Vanta</h1>
          <p>
            Connect your wallet first. If this address has not been invited yet, enter a 6-character
            invite code to continue.
          </p>
        </div>

        <div className="invite-wallet-row">
          <div>
            <span>Wallet</span>
            <strong>{address ? shortenAddress(address) : "Not connected"}</strong>
          </div>
          <button className="invite-button secondary" disabled={isBusy} onClick={connectWallet}>
            <Wallet size={18} />
            {address ? "Switch wallet" : "Connect wallet"}
          </button>
        </div>

        <div className="invite-code-section">
          <div className="invite-code-label">
            <KeyRound size={17} />
            Invite code
          </div>
          <div className="invite-code-grid">
            {code.map((value, index) => (
              <input
                aria-label={`Invite code character ${index + 1}`}
                disabled={!canEditCode}
                key={index}
                maxLength={inviteCodeLength}
                ref={(input: HTMLInputElement | null) => {
                  inputRefs.current[index] = input;
                }}
                value={value}
                onChange={(event) => updateCode(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event.key)}
              />
            ))}
          </div>
        </div>

        {message ? (
          <div className={`invite-message ${gateState === "error" ? "error" : ""}`}>
            {isBusy ? <Loader2 className="invite-spin" size={16} /> : <CheckCircle2 size={16} />}
            {message}
          </div>
        ) : null}

        <button className="invite-button primary" disabled={!canBind || isBusy} onClick={bindInviteCode}>
          {isBusy ? <Loader2 className="invite-spin" size={18} /> : <KeyRound size={18} />}
          {gateState === "binding" ? "Binding" : "Submit invite code"}
        </button>
      </section>
    </div>
  );
}

function sanitizeCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, inviteCodeLength);
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function shortenAddress(address: string) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
