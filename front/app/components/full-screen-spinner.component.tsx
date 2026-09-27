import { Spinner } from '@components';
import { SPINNER_VARIANT } from '@constants';

export function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-page">
      <Spinner variant={SPINNER_VARIANT.page} />
    </div>
  );
}
