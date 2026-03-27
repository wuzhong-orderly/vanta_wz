import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generatePageTitle } from "@/utils/utils";

export default function RewardsIndex() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const searchString = searchParams.toString();
    const redirectPath = searchString 
      ? `/rewards/affiliate?${searchString}` 
      : "/rewards/affiliate";
    
    navigate(redirectPath, { replace: true });
  }, [navigate, searchParams]);

  return (
    <Helmet>
      <title>{generatePageTitle("Rewards")}</title>
    </Helmet>
  );
}

