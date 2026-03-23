import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PosCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get("status") || params.get("data[status]");
  const errorCode = params.get("error_code") || params.get("data[error_code]");
  const transactionId = params.get("transaction_id") || params.get("data[transaction_id]");

  const isSuccess = status === "ok";

  useEffect(() => {
    // Auto-redirect back to dashboard after 5 seconds on success
    if (isSuccess) {
      const timer = setTimeout(() => navigate("/dashboard"), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        {isSuccess ? (
          <>
            <CheckCircle2 className="size-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-green-700">Payment Successful!</h1>
            {transactionId && (
              <p className="text-sm text-gray-500">Transaction: {transactionId}</p>
            )}
            <p className="text-sm text-gray-600">
              Redirecting to dashboard...
            </p>
          </>
        ) : (
          <>
            <XCircle className="size-16 text-red-400 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-800">Payment Not Completed</h1>
            {errorCode && (
              <p className="text-sm text-red-500">Error: {errorCode}</p>
            )}
            <p className="text-sm text-gray-600">
              The payment was cancelled or failed. You can try again from the booking page.
            </p>
          </>
        )}
        <Button onClick={() => navigate("/dashboard")} className="w-full">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
