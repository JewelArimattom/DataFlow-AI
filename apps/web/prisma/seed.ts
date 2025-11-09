import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface InvoiceData {
  invoice_number: string
  date: string
  due_date?: string
  amount: number
  tax?: number
  total: number
  status: string
  vendor: {
    name: string
    category?: string
    email?: string
    phone?: string
    address?: string
  }
  customer?: {
    name: string
    email?: string
    phone?: string
    address?: string
  }
  line_items?: Array<{
    description: string
    quantity: number
    unit_price: number
    amount: number
    category?: string
  }>
  payments?: Array<{
    amount: number
    payment_date: string
    method?: string
    reference?: string
    notes?: string
  }>
  notes?: string
}

async function main() {
  console.log('Starting seed...')

  // Read JSON file - try multiple possible paths
  const possiblePaths = [
    path.join(process.cwd(), '../../data/Analytics_Test_Data.json'),
    path.join(process.cwd(), '../../../data/Analytics_Test_Data.json'),
    path.join(__dirname, '../../../../data/Analytics_Test_Data.json'),
    path.join(process.cwd(), 'data/Analytics_Test_Data.json'),
  ]

  let dataPath: string | null = null
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dataPath = p
      break
    }
  }

  if (!dataPath) {
    console.error('Error: Analytics_Test_Data.json not found!')
    console.error('Tried paths:')
    possiblePaths.forEach(p => console.error(`  - ${p}`))
    console.error('\nPlease place Analytics_Test_Data.json in the /data directory at the root.')
    process.exit(1)
  }

  console.log(`Reading data from: ${dataPath}`)

  let jsonData: string
  try {
    jsonData = fs.readFileSync(dataPath, 'utf-8')
  } catch (error) {
    console.error(`Error reading file: ${error}`)
    process.exit(1)
  }

  let invoices: InvoiceData[]
  try {
    const parsed = JSON.parse(jsonData)
    // Handle both array and object with array property
    invoices = Array.isArray(parsed) ? parsed : (parsed.invoices || parsed.data || [])
  } catch (error) {
    console.error(`Error parsing JSON: ${error}`)
    process.exit(1)
  }

  if (!Array.isArray(invoices) || invoices.length === 0) {
    console.error('Error: JSON file must contain an array of invoices')
    console.error(`Found: ${typeof invoices}, Length: ${invoices?.length || 0}`)
    process.exit(1)
  }

  console.log(`Found ${invoices.length} invoices to process`)

  // Debug: Show first invoice structure
  if (invoices.length > 0) {
    console.log('\nSample invoice structure (first item):')
    console.log(JSON.stringify(invoices[0], null, 2).substring(0, 500))
    console.log('\n')
  }

  // Create maps to track existing vendors and customers
  const vendorMap = new Map<string, string>()
  const customerMap = new Map<string, string>()

  // Process invoices
  for (let i = 0; i < invoices.length; i++) {
    const rawData = invoices[i]
    
    if (!rawData) {
      console.warn(`Skipping undefined invoice at index ${i}`)
      continue
    }

    try {
      // Extract data from MongoDB-style nested structure
      const extractedData = (rawData as any).extractedData?.llmData
      
      if (!extractedData) {
        console.warn(`Skipping invoice at index ${i}: missing extractedData.llmData`)
        continue
      }

      // Extract vendor name from nested structure
      let vendorName: string | null = null
      if (extractedData.vendor?.value?.vendorName?.value) {
        vendorName = extractedData.vendor.value.vendorName.value
      }

      if (!vendorName) {
        console.warn(`Skipping invoice at index ${i}: missing vendor name`)
        continue
      }

      // Extract invoice number from nested structure
      let invoiceNumber: string | null = null
      if (extractedData.invoice?.value?.invoiceId?.value) {
        invoiceNumber = String(extractedData.invoice.value.invoiceId.value)
      } else if ((rawData as any)._id) {
        invoiceNumber = (rawData as any)._id
      }

      if (!invoiceNumber) {
        console.warn(`Skipping invoice at index ${i}: missing invoice number`)
        continue
      }

      // Handle vendor
      let vendorId = vendorMap.get(vendorName)
      if (!vendorId) {
        const existingVendor = await prisma.vendor.findFirst({
          where: { name: vendorName },
        })
        if (existingVendor) {
          vendorId = existingVendor.id
        } else {
          // Extract vendor details from nested structure
          const vendorData = extractedData.vendor?.value || {}
          
          const vendor = await prisma.vendor.create({
            data: {
              name: vendorName,
              category: null, // Not available in this structure
              email: null, // Not available in this structure
              phone: null, // Not available in this structure
              address: vendorData.vendorAddress?.value || null,
            },
          })
          vendorId = vendor.id
        }
        vendorMap.set(vendorName, vendorId!)
      }

      // Handle customer (if exists) - extract from nested structure
      let customerId: string | undefined = undefined
      let customerName: string | null = null
      
      if (extractedData.customer?.value?.customerName?.value) {
        customerName = extractedData.customer.value.customerName.value
      }
      
      if (customerName) {
        customerId = customerMap.get(customerName)
        if (!customerId) {
          const existingCustomer = await prisma.customer.findFirst({
            where: { name: customerName },
          })
          if (existingCustomer) {
            customerId = existingCustomer.id
          } else {
            const customerData = extractedData.customer?.value || {}
            
            const customer = await prisma.customer.create({
              data: {
                name: customerName,
                email: null, // Not available in this structure
                phone: null, // Not available in this structure
                address: customerData.customerAddress?.value || null,
              },
            })
            customerId = customer.id
          }
          customerMap.set(customerName, customerId!)
        }
      }

      // Extract invoice details from nested structure
      const invoiceData = extractedData.invoice?.value || {}
      const summaryData = extractedData.summary?.value || {}
      const paymentData = extractedData.payment?.value || {}
      
      // Parse dates
      const invoiceDate = invoiceData.invoiceDate?.value 
        ? new Date(invoiceData.invoiceDate.value) 
        : (rawData as any).createdAt?.$date 
          ? new Date((rawData as any).createdAt.$date)
          : new Date()
      
      const dueDate = paymentData.dueDate?.value 
        ? (paymentData.dueDate.value ? new Date(paymentData.dueDate.value) : null)
        : null
      
      // Extract amounts
      const subTotal = summaryData.subTotal?.value || 0
      const tax = summaryData.totalTax?.value || 0
      const total = summaryData.invoiceTotal?.value || subTotal
      
      // Determine status
      const status = (rawData as any).status === 'processed' ? 'pending' : 'pending'
      
      // Create invoice
      const invoice = await prisma.invoice.upsert({
        where: { invoiceNumber: invoiceNumber },
        update: {},
        create: {
          invoiceNumber: invoiceNumber,
          date: invoiceDate,
          dueDate: dueDate,
          amount: Math.abs(subTotal), // Use absolute value
          tax: tax ? Math.abs(tax) : null,
          total: Math.abs(total), // Use absolute value
          status: status,
          vendorId,
          customerId: customerId || null,
          notes: (rawData as any).name || null, // Use filename as notes
        },
      })

      // Create line items from nested structure
      const lineItemsData = extractedData.lineItems?.value?.items?.value || []
      
      if (Array.isArray(lineItemsData) && lineItemsData.length > 0) {
        await prisma.lineItem.createMany({
          data: lineItemsData.map((item: any) => ({
            invoiceId: invoice.id,
            description: item.description?.value || 'Item',
            quantity: item.quantity?.value || 1,
            unitPrice: item.unitPrice?.value ? Math.abs(item.unitPrice.value) : 0,
            amount: item.totalPrice?.value ? Math.abs(item.totalPrice.value) : 0,
            category: item.Sachkonto?.value || null, // Use Sachkonto as category
          })),
          skipDuplicates: true,
        })
      }

      // Payments are not in the structure, skip for now
      // If payments exist later, they would be in a similar nested structure
    } catch (error) {
      // Try to get invoice number from various sources for error message
      let invoiceNum = `at index ${i}`
      try {
        const extractedData = (rawData as any).extractedData?.llmData
        if (extractedData?.invoice?.value?.invoiceId?.value) {
          invoiceNum = String(extractedData.invoice.value.invoiceId.value)
        } else if ((rawData as any)._id) {
          invoiceNum = (rawData as any)._id
        }
      } catch {
        // Ignore errors in error handler
      }
      console.error(`Error processing invoice ${invoiceNum}:`, error)
      if (error instanceof Error) {
        console.error(`  Message: ${error.message}`)
      }
    }
  }

  console.log('Seed completed!')
  console.log(`Created ${vendorMap.size} vendors`)
  console.log(`Created ${customerMap.size} customers`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

