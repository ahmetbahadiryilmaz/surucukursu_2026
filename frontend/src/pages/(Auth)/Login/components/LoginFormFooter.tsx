import { Link } from "react-router-dom";

export default function LoginFormFooter() {
  return (
    <div className="mt-4 text-center text-sm text-muted-foreground">
      <Link to="/forgot-password" className="underline hover:text-primary">
        Şifremi Unuttum
      </Link>
    </div>
  );
}
