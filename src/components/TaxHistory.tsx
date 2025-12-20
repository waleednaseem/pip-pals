import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaxPayment } from "@/types/lifeline";
import { Receipt } from "lucide-react";

interface TaxHistoryProps {
  taxPayments: TaxPayment[];
  currency: string;
}

export const TaxHistory = ({ taxPayments, currency }: TaxHistoryProps) => {
  if (taxPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Tax Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No tax payments recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalTaxPaidUSD = taxPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalTaxPaidLocal = taxPayments.reduce((sum, payment) => sum + payment.amountLocal, 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Tax Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total Tax Paid (USD)</p>
              <p className="text-2xl font-bold text-primary">
                ${totalTaxPaidUSD.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Total Tax Paid ({currency})</p>
              <p className="text-2xl font-bold text-primary">
                {currency} {totalTaxPaidLocal.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {taxPayments
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 bg-muted/50 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        Tax Payment
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString()} at{" "}
                        {new Date(payment.date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">USD Amount</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        ${payment.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{currency} Amount</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        {currency} {payment.amountLocal.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Exchange Rate</p>
                      <p className="font-semibold">
                        {payment.exchangeRate.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Covered {payment.earningsIds.length} earning(s)
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
