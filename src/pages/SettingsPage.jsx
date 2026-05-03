import React, { useState, useEffect } from 'react';
import { Bell, Link2, Shield, ChevronRight, Key, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

const SettingSection = ({ icon: Icon, title, description, badge }) => (
    <div className="flex items-center justify-between py-4 border-b border-[#f5f5f7] last:border-0 group">
        <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-[#f5f5f7] shrink-0 group-hover:bg-[#eef3fe] transition-colors">
                <Icon size={16} className="text-[#6e6e73] group-hover:text-[#4f86f7] transition-colors" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-[#1d1d1f]">{title}</p>
                    {badge && (
                        <span className="text-[10px] font-semibold text-[#92400e] bg-[#fffbeb] border border-[#fde68a] px-2 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-[12px] text-[#9ca3af] mt-0.5">{description}</p>
            </div>
        </div>
        <ChevronRight size={15} className="text-[#d1d5db] shrink-0" />
    </div>
);

const InfoRow = ({ label, value, placeholder }) => (
    <div className="space-y-1.5 mb-5">
        <label className="block text-[12px] font-medium text-[#6e6e73] uppercase tracking-wider">{label}</label>
        <div className="w-full bg-[#f9fafb] border border-[#e5e5ea] rounded-xl px-4 py-3 text-[13px] text-[#9ca3af] font-medium">
            {value || <span className="italic">{placeholder}</span>}
        </div>
    </div>
);

export default function SettingsPage() {
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [connectionState, setConnectionState] = useState('disconnected');
    const [sellerInfo, setSellerInfo] = useState(null);
    const [authError, setAuthError] = useState('');

    const getProfile = () => {
        if (!sellerInfo) return null;
        const target = sellerInfo.seller || sellerInfo.data || sellerInfo;
        return {
            name: target.seller_name || target.display_name || target.name || 'Verified Seller',
            id: target.seller_id || target.id || 'N/A',
            status: target.status || 'Active'
        };
    };

    const profile = getProfile();

    useEffect(() => {
        const init = async () => {
            try {
                setConnectionState('testing');
                const data = await apiService.seller.getConnected();
                setSellerInfo(data.data || data);
                setConnectionState('connected');
            } catch {
                setConnectionState('disconnected');
            }
        };

        init();
    }, []);

    const handleConnect = async () => {
        if (!apiKeyInput.trim()) return;

        setConnectionState('testing');
        setAuthError('');
        setSellerInfo(null);

        try {
            const data = await apiService.seller.connect(apiKeyInput.trim());
            setSellerInfo(data.data || data);
            setConnectionState('connected');
            setApiKeyInput('');
        } catch (err) {
            setConnectionState('invalid');
            setAuthError(err.message || 'Failed to verify connection.');
        }
    };

    const handleDisconnect = async () => {
        try {
            await apiService.seller.disconnect();
        } catch { }

        setApiKeyInput('');
        setConnectionState('disconnected');
        setSellerInfo(null);
        setAuthError('');
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight">Settings</h2>
                <p className="text-[13px] text-[#6e6e73] mt-1">Configure your account, preferences, and integrations</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div className="space-y-5">
                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-5">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest flex items-center gap-2">
                                <Key size={16} className="text-[#86868b]" />
                                Takealot API Connection
                            </h3>

                            {connectionState === 'disconnected' && (
                                <span className="text-[11px] font-semibold text-[#6e6e73] bg-[#f5f5f7] px-2.5 py-1 rounded-full border border-[#e5e5ea]">
                                    Not Connected
                                </span>
                            )}
                            {connectionState === 'testing' && (
                                <span className="text-[11px] font-semibold text-[#d97706] bg-[#fffbeb] px-2.5 py-1 rounded-full border border-[#fde68a] flex items-center gap-1.5">
                                    <Loader2 size={12} className="animate-spin" />
                                    Testing...
                                </span>
                            )}
                            {connectionState === 'connected' && (
                                <span className="text-[11px] font-semibold text-[#16a34a] bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#bbf7d0] flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    Connected
                                </span>
                            )}
                            {connectionState === 'invalid' && (
                                <span className="text-[11px] font-semibold text-[#dc2626] bg-[#fef2f2] px-2.5 py-1 rounded-full border border-[#fecaca] flex items-center gap-1">
                                    <XCircle size={12} />
                                    Invalid Key
                                </span>
                            )}
                        </div>

                        <p className="text-[13px] text-[#6e6e73] mb-4">
                            Connect securely to your Takealot Seller Portal. The key is verified and stored in your backend.
                        </p>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <input
                                    type="password"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    placeholder="Enter Takealot API Key"
                                    className="flex-1 bg-[#f9fafb] border border-[#e5e5ea] rounded-xl px-4 py-2.5 text-[14px] text-[#1d1d1f] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#4f86f7]/20 focus:border-[#4f86f7] transition-all"
                                />
                                <button
                                    onClick={handleConnect}
                                    disabled={connectionState === 'testing' || !apiKeyInput.trim()}
                                    className="bg-[#4f86f7] hover:bg-[#3b6bd6] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-colors"
                                >
                                    {connectionState === 'testing' ? 'Verifying...' : 'Save & Verify'}
                                </button>
                                {(apiKeyInput || profile) && (
                                    <button
                                        onClick={handleDisconnect}
                                        className="bg-[#fef2f2] hover:bg-[#fca5a5] text-[#dc2626] text-[13px] font-semibold py-2.5 px-4 rounded-xl transition-colors border border-[#fecaca]"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {connectionState === 'invalid' && (
                                <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[12.5px] text-[#dc2626]">
                                    {authError}
                                </div>
                            )}

                            {connectionState === 'connected' && profile && (
                                <div className="mt-4 p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl">
                                    <p className="text-[12px] font-medium text-[#16a34a] uppercase tracking-wider mb-2">Verified Seller Profile</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[11px] text-[#16a34a]/70 font-medium">Business Name</p>
                                            <p className="text-[14px] font-semibold text-[#16a34a]">{profile.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-[#16a34a]/70 font-medium">Seller ID</p>
                                            <p className="text-[14px] font-semibold text-[#16a34a]">{profile.id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-[#16a34a]/70 font-medium">Status</p>
                                            <p className="text-[14px] font-semibold text-[#16a34a]">{profile.status}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-5 opacity-60">
                        <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest mb-5">Business Profile (Local overrides)</h3>
                        <InfoRow label="Business Name" value={profile?.name} placeholder="Not configured" />
                        <InfoRow label="Seller Account" value={profile?.id} placeholder="Not configured" />
                        <InfoRow label="VAT Number" placeholder="Not VAT registered" />
                        <div className="pt-1">
                            <button disabled className="bg-[#f5f5f7] text-[#a1a1a6] text-[13px] font-semibold py-2.5 px-6 rounded-full cursor-not-allowed border border-[#e5e5ea]">
                                Edit Profile — Coming Soon
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-5">
                        <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest mb-1">Preferences</h3>
                        <SettingSection icon={Bell} title="Notifications" description="Configure alerts for claims, returns, and activity" badge="Soon" />
                        <SettingSection icon={Link2} title="Integrations" description="Connect your own tools and data sources" badge="Soon" />
                        <SettingSection icon={Shield} title="Security" description="Manage access, permissions, and session settings" badge="Soon" />
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-6">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#4f86f7] to-[#3b6bd6] rounded-2xl flex items-center justify-center text-white text-[22px] font-semibold shadow-md mb-4">
                                {profile ? profile.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <p className="text-[15px] font-semibold text-[#1d1d1f]">{profile ? profile.name : 'Guest Seller'}</p>
                            <p className="text-[12px] text-[#86868b] mt-0.5">{profile ? `ID: ${profile.id}` : 'Disconnected'}</p>
                        </div>
                        <div className="space-y-2 text-[12px]">
                            <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                                <span className="text-[#86868b] font-medium">Plan</span>
                                <span className="font-semibold text-[#1d1d1f]">Pro OS</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                                <span className="text-[#86868b] font-medium">Status</span>
                                <span className="font-semibold text-[#1d1d1f]">{profile ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#eef3fe] to-white rounded-3xl border border-[#cbe0ff] px-6 py-5">
                        <p className="text-[12px] font-medium text-[#4f86f7] uppercase tracking-widest mb-2">About Seller OS</p>
                        <p className="text-[13px] text-[#374151] leading-relaxed mb-1">
                            A unified architecture to connect Takealot sellers directly with actionable, API-driven workflows.
                        </p>
                        <p className="text-[12px] text-[#86868b]">Version 1.0 · Connected Hub</p>
                    </div>
                </div>
            </div>
        </div>
    );
}