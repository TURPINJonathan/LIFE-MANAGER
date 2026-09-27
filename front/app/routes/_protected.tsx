import { AuthGuard } from '@security';

export default function ProtectedLayout() {
  return <AuthGuard />;
}
