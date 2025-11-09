import { OverviewCards } from '@/components/dashboard/overview-cards'
import { InvoiceVolumeValueTrend as InvoiceTrendsChart } from '@/components/dashboard/invoice-trends-chart'
import { VendorsChart } from '@/components/dashboard/vendors-chart'
import { CategoryChart } from '@/components/dashboard/category-chart'
import { CashOutflowChart } from '@/components/dashboard/cash-outflow-chart'
import { InvoicesByVendorTable } from '@/components/dashboard/invoices-by-vendor-table'

export default function DashboardPage() {
  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="space-y-6">
        <OverviewCards />

        <div className="grid gap-6 md:grid-cols-2">
          <InvoiceTrendsChart />
          <VendorsChart />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <CategoryChart />
          <CashOutflowChart />
          <div className="">
            <InvoicesByVendorTable />
          </div>
        </div>
      </div>
    </div>
  )
}

