import { MOCK_CAMPAIGNS } from "@/lib/mockData";
import { CampaignDetail } from "@/components/dashboard/CampaignDetail";

// Required for static export: pre-generate pages for known campaign IDs.
export function generateStaticParams() {
  return MOCK_CAMPAIGNS.map((c) => ({ id: c.id }));
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return <CampaignDetail id={params.id} />;
}
