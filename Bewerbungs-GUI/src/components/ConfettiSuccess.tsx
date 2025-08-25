import { useEffect, useState } from "react";
import Confetti from "react-confetti";

interface Props { trigger: boolean; onDone: () => void }

export default function ConfettiSuccess({ trigger, onDone }: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setActive(true);
      const t = setTimeout(() => { setActive(false); onDone(); }, 4000);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  if (!active) return null;
  return <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />;
} 