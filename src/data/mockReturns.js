export const returnMetrics = {
    overallRate: "4.2%",
    overallRateTrend: "+0.3%",
    openReturns: 28,
    defectiveDamaged: 15,
    highRiskSkus: 3
};

export const returnReasons = [
    { label: "Customer Changed Mind", count: 45, percentage: 38 },
    { label: "Defective / Damaged", count: 32, percentage: 27 },
    { label: "Item Not As Described", count: 21, percentage: 18 },
    { label: "Wrong Item Sent", count: 12, percentage: 10 },
    { label: "Other", count: 8, percentage: 7 }
];

export const returnTrends = [
    { month: "Jan", returns: 45, rate: 3.8 },
    { month: "Feb", returns: 52, rate: 4.1 },
    { month: "Mar", returns: 48, rate: 3.9 },
    { month: "Apr", returns: 68, rate: 4.5 },
    { month: "May", returns: 55, rate: 4.2 },
    { month: "Jun", returns: 61, rate: 4.4 }
];

export const flaggedProducts = [
    { id: "P001", sku: "TECH-LP-01", name: "UltraThin Laptop Sleeve 15-inch", returns: 18, risk: "High", issue: "Defective Zipper" },
    { id: "P002", sku: "HMG-CF-02", name: "Ceramic Coffee Mug Set", returns: 14, risk: "Medium", issue: "Damaged in Transit" },
    { id: "P003", sku: "FIT-WB-05", name: "Smart Water Bottle", returns: 22, risk: "High", issue: "Battery Defect" }
];

export const returnsTableData = [
    { 
        id: 1, 
        sku: "TECH-LP-01", 
        product: "UltraThin Laptop Sleeve 15-inch", 
        returns: 18, 
        rate: "8.5%", 
        mainReason: "Defective / Damaged", 
        riskLevel: "High", 
        action: "Check supplier quality" 
    },
    { 
        id: 2, 
        sku: "FIT-WB-05", 
        product: "Smart Water Bottle", 
        returns: 22, 
        rate: "12.3%", 
        mainReason: "Item Not As Described", 
        riskLevel: "High", 
        action: "Review listing" 
    },
    { 
        id: 3, 
        sku: "HMG-CF-02", 
        product: "Ceramic Coffee Mug Set", 
        returns: 14, 
        rate: "5.1%", 
        mainReason: "Defective / Damaged", 
        riskLevel: "Medium", 
        action: "Improve packaging" 
    },
    { 
        id: 4, 
        sku: "OFF-CH-09", 
        product: "Ergonomic Office Chair", 
        returns: 8, 
        rate: "2.4%", 
        mainReason: "Customer Changed Mind", 
        riskLevel: "Low", 
        action: "Monitor" 
    },
    { 
        id: 5, 
        sku: "KID-TY-11", 
        product: "Educational Wood Blocks", 
        returns: 35, 
        rate: "15.8%", 
        mainReason: "Defective / Damaged", 
        riskLevel: "Critical", 
        action: "Deactivate SKU" 
    },
    { 
        id: 6, 
        sku: "APL-CB-03", 
        product: "USB-C Fast Charging Cable", 
        returns: 42, 
        rate: "3.2%", 
        mainReason: "Customer Changed Mind", 
        riskLevel: "Low", 
        action: "Monitor" 
    }
];
