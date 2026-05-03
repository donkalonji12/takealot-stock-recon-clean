export const profitMetrics = {
    grossRevenue: "R 245,600",
    grossRevenueTrend: "+12.4%",
    estimatedFees: "R 86,450",
    estimatedFeesTrend: "+5.1%",
    netProfit: "R 98,200",
    netProfitTrend: "+18.2%",
    lossMakingSkus: 4
};

export const feeBreakdown = [
    { label: "Takealot Referral Fees", value: 35000, percentage: 40 },
    { label: "Fulfillment Fees", value: 28000, percentage: 32 },
    { label: "Storage Fees", value: 12000, percentage: 14 },
    { label: "Payment Fees", value: 6450, percentage: 8 },
    { label: "Other Fees (Promo, etc.)", value: 5000, percentage: 6 }
];

export const profitTrends = [
    { month: "Jan", revenue: 180000, profit: 68000 },
    { month: "Feb", revenue: 195000, profit: 75000 },
    { month: "Mar", revenue: 210000, profit: 81000 },
    { month: "Apr", revenue: 205000, profit: 79000 },
    { month: "May", revenue: 230000, profit: 92000 },
    { month: "Jun", revenue: 245600, profit: 98200 }
];

export const topProfitableSkus = [
    { id: "P1", sku: "TECH-LP-15", name: "Ultra-Fast SSD 1TB", profit: "R 24,500", margin: "32%" },
    { id: "P2", sku: "HOM-CF-02", name: "Premium Coffee Maker", profit: "R 18,200", margin: "28%" },
    { id: "P3", sku: "SPO-YM-08", name: "Pro Yoga Mat", profit: "R 12,400", margin: "45%" }
];

export const lossMakingProducts = [
    { id: "L1", sku: "KID-TY-11", name: "Educational Wood Blocks", loss: "-R 3,500", issue: "High Return Rate" },
    { id: "L2", sku: "APP-CH-03", name: "Standard Charging Cable", loss: "-R 1,200", issue: "Storage Fees" },
    { id: "L3", sku: "HOM-LM-05", name: "Ceramic Table Lamp", loss: "-R 850", issue: "Damaged Transit" }
];

export const profitTableData = [
    { 
        id: 1, 
        sku: "TECH-LP-15", 
        product: "Ultra-Fast SSD 1TB", 
        sellingPrice: "R 1,899", 
        estimatedCosts: "R 850", 
        estimatedFees: "R 440", 
        returnRate: "2.1%", 
        margin: "32%",
        netProfit: "R 609", 
        status: "Healthy",
        action: "Maintain stock levels",
        rowColor: "green"
    },
    { 
        id: 2, 
        sku: "HOM-CF-02", 
        product: "Premium Coffee Maker", 
        sellingPrice: "R 2,499", 
        estimatedCosts: "R 1,100", 
        estimatedFees: "R 700", 
        returnRate: "5.4%", 
        margin: "28%",
        netProfit: "R 699", 
        status: "Healthy",
        action: "Monitor fee impact",
        rowColor: "green"
    },
    { 
        id: 3, 
        sku: "SPO-YM-08", 
        product: "Pro Yoga Mat", 
        sellingPrice: "R 499", 
        estimatedCosts: "R 120", 
        estimatedFees: "R 150", 
        returnRate: "1.5%", 
        margin: "45%",
        netProfit: "R 229", 
        status: "Excellent",
        action: "Increase marketing spend",
        rowColor: "green"
    },
    { 
        id: 4, 
        sku: "OFF-CH-09", 
        product: "Ergonomic Office Chair", 
        sellingPrice: "R 3,299", 
        estimatedCosts: "R 1,800", 
        estimatedFees: "R 1,100", 
        returnRate: "8.2%", 
        margin: "12%",
        netProfit: "R 399", 
        status: "Warning",
        action: "Review pricing structure",
        rowColor: "yellow"
    },
    { 
        id: 5, 
        sku: "KID-TY-11", 
        product: "Educational Wood Blocks", 
        sellingPrice: "R 299", 
        estimatedCosts: "R 150", 
        estimatedFees: "R 120", 
        returnRate: "15.8%", 
        margin: "-6%",
        netProfit: "-R 20", 
        status: "Critical",
        action: "Improve packaging",
        rowColor: "red"
    },
    { 
        id: 6, 
        sku: "APP-CH-03", 
        product: "Standard Charging Cable", 
        sellingPrice: "R 149", 
        estimatedCosts: "R 50", 
        estimatedFees: "R 130", 
        returnRate: "4.5%", 
        margin: "-20%",
        netProfit: "-R 31", 
        status: "Critical",
        action: "Deactivate SKU",
        rowColor: "red"
    },
    { 
        id: 7, 
        sku: "FAS-SW-04", 
        product: "Cotton Basic Sweater", 
        sellingPrice: "R 350", 
        estimatedCosts: "R 180", 
        estimatedFees: "R 120", 
        returnRate: "3.2%", 
        margin: "14%",
        netProfit: "R 50", 
        status: "Warning",
        action: "Increase price or reduce cost",
        rowColor: "yellow"
    }
];
