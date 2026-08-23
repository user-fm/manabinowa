import { redirect } from "next/navigation";

// 旧オンボーディングURL。実体は /onboarding/profile に集約した(B-09〜B-14)。
export default function OnboardingPage() {
  redirect("/onboarding/profile");
}
