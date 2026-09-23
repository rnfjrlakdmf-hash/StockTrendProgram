import { redirect } from "next/navigation";

export default function ScannerPage() {
    redirect("/signals?tab=scanner");
}
