import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { DEFAULT_SYMBOL } from "@/utils/storage";

export default function PerpIndex() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const searchParamsString = searchParams.toString();
    const redirectPath = `/perp/${DEFAULT_SYMBOL}${searchParamsString ? `?${searchParamsString}` : ''}`;
    navigate(redirectPath, { replace: true });
  }, [navigate, searchParams]);

  return null;
}

