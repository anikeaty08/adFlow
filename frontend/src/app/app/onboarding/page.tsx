import { StudioScreen } from '@/components/studio/studio-screen';
export default function OnboardingPage() {
  return (
    <StudioScreen
      description="Connect a wallet, choose your role, and create a profile before creating campaigns or inventory."
      title="Welcome to AdFlow"
    >
      <button className="buttonPrimary" type="button">
        Connect wallet
      </button>
    </StudioScreen>
  );
}
