import React from 'react';
import { Truck, MapPin, PackageCheck, Clock, AlertTriangle } from 'lucide-react';

const MetricCard = ({ label, value, sub }) => (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] px-5 py-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#86868b] mb-2">{label}</p>
        <p className="text-[26px] font-semibold text-[#d1d5db] leading-none tracking-tight">{value}</p>
        {sub && <p className="text-[11px] mt-1.5 text-[#9ca3af] font-medium">{sub}</p>}
    </div>
);

const FeatureRow = ({ icon: Icon, title, desc }) => (
    <div className="flex items-start gap-3 py-3.5 border-b border-[#f5f5f7] last:border-0">
        <div className="p-2 rounded-xl bg-[#f5f5f7] shrink-0 mt-0.5">
            <Icon size={15} className="text-[#6e6e73]" />
        </div>
        <div>
            <p className="text-[13.5px] font-semibold text-[#374151]">{title}</p>
            <p className="text-[12px] text-[#9ca3af] mt-0.5">{desc}</p>
        </div>
    </div>
);

export default function ShipmentsPage() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

            {/* Hero */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-[#eff6ff] shrink-0">
                        <Truck size={22} className="text-[#3b82f6]" />
                    </div>
                    <div>
                        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight">Shipments</h2>
                        <p className="text-[13px] text-[#6e6e73] mt-0.5">Track inbound and outbound shipments across all warehouses</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fffbeb] border border-[#fde68a] self-start sm:self-auto">
                    <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
                    <span className="text-[11px] font-medium text-[#92400e] uppercase tracking-wide">In Development</span>
                </div>
            </div>

            {/* Metrics preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard label="Active Shipments"  value="—"  sub="No data yet" />
                <MetricCard label="In Transit"        value="—"  sub="Coming soon" />
                <MetricCard label="Delivered"         value="—"  sub="Coming soon" />
                <MetricCard label="Exceptions"        value="—"  sub="Coming soon" />
            </div>

            {/* Feature preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-6">
                    <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest mb-4">Planned Features</h3>
                    <FeatureRow icon={MapPin}        title="Live Shipment Tracking"     desc="Track shipments in real time from your warehouse to Takealot DC" />
                    <FeatureRow icon={PackageCheck}  title="Receiving Confirmation"     desc="Get notified when Takealot confirms receipt of your consignments" />
                    <FeatureRow icon={AlertTriangle} title="Discrepancy Alerts"         desc="Identify cases where received quantities differ from what was shipped" />
                    <FeatureRow icon={Clock}         title="Lead Time Analytics"        desc="Analyse average shipment lead times by warehouse and product category" />
                </div>

                <div className="bg-gradient-to-br from-[#eff6ff] to-white rounded-3xl border border-[#bfdbfe] px-6 py-6 flex flex-col justify-between">
                    <div>
                        <p className="text-[12px] font-medium text-[#3b82f6] uppercase tracking-widest mb-3">What's coming</p>
                        <h4 className="text-[18px] font-semibold text-[#1d1d1f] leading-snug mb-3">
                            Full shipment visibility from door to DC
                        </h4>
                        <p className="text-[13px] text-[#6e6e73] leading-relaxed">
                            Know exactly where your stock is at every step. This module will surface discrepancies between shipped and received quantities, helping you build stronger claims and reduce phantom losses.
                        </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-[#bfdbfe]/50">
                        <p className="text-[12px] text-[#9ca3af] font-medium">Estimated availability: Q4 2026</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
