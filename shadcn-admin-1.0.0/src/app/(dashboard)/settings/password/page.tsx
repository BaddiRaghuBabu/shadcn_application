import ContentSection from "../components/content-section";
import ChangePasswordForm from "./change-password-form";

export default function SettingsPasswordPage() {
  return (
    <ContentSection title="Change Password" desc="Update your account password.">
      <ChangePasswordForm />
    </ContentSection>
  );
}