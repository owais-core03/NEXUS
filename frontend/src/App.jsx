import { useState, useEffect, useMemo } from 'react';
import {
  checkHealth,
  createInvestigation,
  getInvestigationSummary,
  getInvestigationTransactions
} from './api/client';
import {
  ShieldCheck,
  Search,
  ExternalLink,
  Copy,
  Check,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Layers,
  Users,
  AlertCircle,
  RefreshCw,
  Terminal,
  Filter,
  Download,
  History,
  ArrowUpDown,
  Wallet,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  BarChart3,
  Calendar,
  ChevronRight
} from 'lucide-react';

const SAMPLE_TARGETS = [
  { label: 'vitalik.eth', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', role: 'Ethereum Founder & Ecosystem Core' },
  { label: 'Binance 14', address: '0x28C6c06298d514Db089934071355E5743bf21d60', role: 'Major Exchange Hot Reserve Wallet' },
  { label: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', role: 'Decentralized AMM Router Contract' },
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [addressInput, setAddressInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  // Investigation Data
  const [activeInvestigation, setActiveInvestigation] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [recentHistory, setRecentHistory] = useState([
    { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik.eth', time: 'Seed' }
  ]);

  // Dynamic Workspace Controls
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger', 'counterparties', 'tokens'
  const [selectedAsset, setSelectedAsset] = useState('ALL'); // 'ALL' or specific token
  const [txTypeFilter, setTxTypeFilter] = useState('all'); // 'all', 'native', 'erc20'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('timestamp'); // 'timestamp', 'value'
  const [sortAsc, setSortAsc] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Health check on initial load
  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch((err) => setError(`Backend offline: ${err.message}`));
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const executeInvestigation = async (addrToUse) => {
    const target = (addrToUse || addressInput).trim();
    if (!target) return;

    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setSearchQuery('');
    setSelectedAsset('ALL');

    try {
      const inv = await createInvestigation(target, 1);
      setActiveInvestigation(inv);

      // Add to recent searches
      setRecentHistory((prev) => {
        const filtered = prev.filter((p) => p.address.toLowerCase() !== target.toLowerCase());
        const match = SAMPLE_TARGETS.find((s) => s.address.toLowerCase() === target.toLowerCase());
        return [
          {
            address: target,
            label: match ? match.label : `${target.slice(0, 6)}...${target.slice(-4)}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...filtered.slice(0, 4)
        ];
      });

      const [sumData, txData] = await Promise.all([
        getInvestigationSummary(inv.id),
        getInvestigationTransactions(inv.id),
      ]);
      setSummary(sumData);
      setTransactions(txData.transactions || []);
    } catch (err) {
      setError(err.message || 'Investigation query failed.');
    } finally {
      setLoading(false);
    }
  };

  // Discovered tokens breakdown
  const discoveredTokens = useMemo(() => {
    const tokenCounts = new Map();
    tokenCounts.set('ALL', transactions.length);
    tokenCounts.set('ETH', transactions.filter((t) => t.record_type === 'native').length);

    transactions.forEach((tx) => {
      if (tx.record_type === 'erc20' && tx.asset_symbol) {
        const sym = tx.asset_symbol.toUpperCase();
        tokenCounts.set(sym, (tokenCounts.get(sym) || 0) + 1);
      }
    });

    return Array.from(tokenCounts.entries()).map(([symbol, count]) => ({ symbol, count }));
  }, [transactions]);

  // Filtered & Sorted Transactions
  const processedTransactions = useMemo(() => {
    let list = transactions;

    // Type filter
    if (txTypeFilter === 'native') list = list.filter((t) => t.record_type === 'native');
    if (txTypeFilter === 'erc20') list = list.filter((t) => t.record_type === 'erc20');

    // Asset filter
    if (selectedAsset !== 'ALL') {
      if (selectedAsset === 'ETH') {
        list = list.filter((t) => t.record_type === 'native');
      } else {
        list = list.filter((t) => (t.asset_symbol || '').toUpperCase() === selectedAsset);
      }
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) =>
        t.transaction_hash.toLowerCase().includes(q) ||
        t.from_address.toLowerCase().includes(q) ||
        (t.to_address && t.to_address.toLowerCase().includes(q)) ||
        (t.asset_symbol && t.asset_symbol.toLowerCase().includes(q))
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'value') {
        valA = Number(a.display_value || 0);
        valB = Number(b.display_value || 0);
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [transactions, txTypeFilter, selectedAsset, searchQuery, sortField, sortAsc]);

  // Paginated records
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedTransactions.slice(start, start + pageSize);
  }, [processedTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(processedTransactions.length / pageSize) || 1;

  // Counterparty aggregation
  const topCounterparties = useMemo(() => {
    if (!activeInvestigation) return [];
    const target = activeInvestigation.target_address.toLowerCase();
    const map = new Map();

    transactions.forEach((tx) => {
      const other = tx.from_address.toLowerCase() === target ? tx.to_address : tx.from_address;
      if (!other) return;
      const key = other.toLowerCase();
      const current = map.get(key) || { address: other, txCount: 0, ethSent: 0, ethReceived: 0, tokens: new Set() };
      current.txCount += 1;
      if (tx.record_type === 'native' && tx.display_value) {
        if (tx.from_address.toLowerCase() === target) {
          current.ethSent += Number(tx.display_value);
        } else {
          current.ethReceived += Number(tx.display_value);
        }
      } else if (tx.asset_symbol) {
        current.tokens.add(tx.asset_symbol);
      }
      map.set(key, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 18);
  }, [transactions, activeInvestigation]);

  // Export CSV
  const handleExportCSV = () => {
    if (!transactions.length) return;
    const headers = ['Record Type', 'Tx Hash', 'Block', 'Timestamp', 'From', 'To', 'Amount', 'Asset'];
    const rows = transactions.map((t) => [
      t.record_type,
      t.transaction_hash,
      t.block_number,
      new Date(t.timestamp * 1000).toISOString(),
      t.from_address,
      t.to_address || 'Contract Creation',
      t.display_value != null ? t.display_value : t.raw_value,
      t.asset_symbol || 'ETH'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NEXUS_${activeInvestigation?.target_address.slice(0, 8)}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#050811] bg-mesh-glow bg-grid-pattern text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Dynamic Bar */}
      <header className="border-b border-slate-800/80 bg-[#080d1a]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-600/30 to-purple-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-extrabold tracking-tight text-white text-xl">NEXUS</span>
              <span className="text-xs uppercase font-mono font-bold tracking-wider px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40">
                Forensic VASP Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Evidence-Based Ethereum Attribution & Traceability Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 text-xs font-mono px-3.5 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-slate-200 font-bold">ETH Mainnet (1)</span>
          </div>

          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 border border-slate-700/80 shadow-md transition"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            Backend Swagger API
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Dynamic Investigation Launcher Hero */}
        <section className="rounded-3xl border border-slate-700/60 bg-gradient-to-b from-[#0c1322]/90 to-[#080d18]/90 backdrop-blur-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-4xl relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              Real-Time Ethereum Investigation Console
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Investigate Any Ethereum Wallet
            </h1>
            <p className="text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
              Extract live Etherscan V2 transactions, identify interacting entities, compute on-chain cash-flows, and run targeted public-web attribution.
            </p>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeInvestigation();
              }}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Paste Ethereum Address (0x...)"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#060912]/90 border border-slate-700/80 text-base font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !addressInput.trim()}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-[0.98] text-slate-950 text-base font-black tracking-tight shadow-[0_0_25px_rgba(6,182,212,0.4)] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Querying Blockchain...
                  </>
                ) : (
                  <>
                    <Activity className="w-5 h-5" />
                    Investigate Target
                  </>
                )}
              </button>
            </form>

            {/* Curated Sample Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Quick Demos:</span>
              {SAMPLE_TARGETS.map((s) => (
                <button
                  key={s.address}
                  onClick={() => {
                    setAddressInput(s.address);
                    executeInvestigation(s.address);
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-200 hover:text-cyan-300 hover:border-cyan-500/40 transition flex items-center gap-2 shadow-sm"
                  title={s.role}
                >
                  <span className="font-bold text-cyan-400">{s.label}</span>
                  <span className="text-slate-400 text-xs font-mono">({s.address.slice(0, 6)}...{s.address.slice(-4)})</span>
                </button>
              ))}
            </div>

            {/* Past History Pills */}
            {recentHistory.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <History className="w-3.5 h-3.5" /> Recent Sessions:
                </span>
                {recentHistory.map((h, idx) => (
                  <button
                    key={`${h.address}-${idx}`}
                    onClick={() => {
                      setAddressInput(h.address);
                      executeInvestigation(h.address);
                    }}
                    className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition"
                  >
                    {h.label} <span className="text-slate-500">({h.time})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Error Callout */}
        {error && (
          <div className="rounded-2xl bg-red-950/40 border border-red-800/80 p-5 text-red-200 text-sm flex items-start gap-4 shadow-xl">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-300 text-base">Investigation Notice</p>
              <p className="text-sm text-red-400/90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Live Investigation Results - Bento Box Architecture */}
        {activeInvestigation && summary && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Bento Grid Row 1: Target Header & Core Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Target Address Card (Span 2) */}
              <div className="lg:col-span-2 rounded-3xl border border-slate-700/80 bg-gradient-to-br from-[#0c1424]/90 to-[#080d18]/90 backdrop-blur-xl p-7 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Active Target Wallet Under Examination
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xl sm:text-2xl font-black text-white break-all tracking-tight">
                        {activeInvestigation.target_address}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(activeInvestigation.target_address)}
                          title="Copy Wallet Address"
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                        >
                          {copiedText === activeInvestigation.target_address ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={`https://etherscan.io/address/${activeInvestigation.target_address}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open in Etherscan Mainnet"
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/80 font-bold self-start sm:self-center flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    {activeInvestigation.status}
                  </span>
                </div>

                {/* 4 Metrics Inside Target Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#060913]/90">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      ETH Transactions
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {summary.native_tx_count.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">Direct L1 native</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#060913]/90">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                      <Coins className="w-4 h-4 text-purple-400" />
                      Token Transfers
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {summary.erc20_transfer_count.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">ERC-20 smart contracts</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#060913]/90">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                      <ArrowUpRight className="w-4 h-4 text-rose-400" />
                      Total Outflow
                    </div>
                    <div className="text-2xl font-black font-mono text-rose-400 truncate">
                      {Number(summary.total_eth_sent).toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">ETH sent</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#060913]/90">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                      Total Inflow
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-400 truncate">
                      {Number(summary.total_eth_received).toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">ETH received</p>
                  </div>
                </div>
              </div>

              {/* Bento Card 2: Interactive Cash-Flow Gauge (Span 1) */}
              <div className="rounded-3xl border border-slate-700/80 bg-gradient-to-br from-[#0c1424]/90 to-[#080d18]/90 backdrop-blur-xl p-7 shadow-xl flex flex-col justify-between space-y-5">
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Net Capital Flow Distribution
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Inflow vs. Outflow Ratio</h3>
                  <p className="text-xs text-slate-400">
                    Relative proportion of capital transferred into and out of this wallet
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-rose-400 flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" /> Outflow:{' '}
                      {(() => {
                        const total = Number(summary.total_eth_sent) + Number(summary.total_eth_received);
                        return total > 0 ? ((Number(summary.total_eth_sent) / total) * 100).toFixed(1) : 0;
                      })()}%
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      Inflow:{' '}
                      {(() => {
                        const total = Number(summary.total_eth_sent) + Number(summary.total_eth_received);
                        return total > 0 ? ((Number(summary.total_eth_received) / total) * 100).toFixed(1) : 0;
                      })()}% <ArrowDownLeft className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex shadow-inner">
                    <div
                      className="bg-gradient-to-r from-rose-600 to-rose-400 h-full transition-all duration-700"
                      style={{
                        width: `${(() => {
                          const total = Number(summary.total_eth_sent) + Number(summary.total_eth_received);
                          return total > 0 ? (Number(summary.total_eth_sent) / total) * 100 : 50;
                        })()}%`
                      }}
                    ></div>
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-700"
                      style={{
                        width: `${(() => {
                          const total = Number(summary.total_eth_sent) + Number(summary.total_eth_received);
                          return total > 0 ? (Number(summary.total_eth_received) / total) * 100 : 50;
                        })()}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-800 bg-[#060913]/90 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-mono">Counterparty Network</span>
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {summary.unique_counterparties.toLocaleString()} Addresses
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-amber-400/30" />
                </div>
              </div>
            </div>

            {/* Interactive Discovered Asset Filter Bar */}
            <div className="rounded-2xl border border-slate-800 bg-[#090e1c]/80 p-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
                <Coins className="w-4 h-4 text-cyan-400" /> Discovered Assets ({discoveredTokens.length - 1}):
              </span>
              {discoveredTokens.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => {
                    setSelectedAsset(t.symbol);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${
                    selectedAsset === t.symbol
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900/90 text-slate-300 hover:text-cyan-300 border border-slate-800'
                  }`}
                >
                  <span>{t.symbol}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    selectedAsset === t.symbol ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Main Interactive Tabbed Table Workspace */}
            <div className="rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#0c1424]/95 to-[#080d18]/95 backdrop-blur-2xl overflow-hidden shadow-2xl">
              {/* Tab Navigation Header */}
              <div className="flex border-b border-slate-800 bg-[#080d1a] px-8 pt-4 gap-8">
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`pb-4 text-base font-extrabold flex items-center gap-2.5 border-b-2 transition ${
                    activeTab === 'ledger'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-5 h-5" />
                  Transaction Ledger ({processedTransactions.length})
                </button>
                <button
                  onClick={() => setActiveTab('counterparties')}
                  className={`pb-4 text-base font-extrabold flex items-center gap-2.5 border-b-2 transition ${
                    activeTab === 'counterparties'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Direct Counterparties Network ({topCounterparties.length})
                </button>
              </div>

              {/* TAB 1: SEARCHABLE TRANSACTION LEDGER */}
              {activeTab === 'ledger' && (
                <div className="p-7 space-y-5">
                  {/* Action Bar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Instant Search Filter */}
                    <div className="relative flex-1 max-w-lg">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Live filter by Hash, Address, or Asset..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#060912] border border-slate-700 text-sm font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Filter Type Pills */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#060912] border border-slate-800">
                        <button
                          onClick={() => {
                            setTxTypeFilter('all');
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            txTypeFilter === 'all'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          All ({transactions.length})
                        </button>
                        <button
                          onClick={() => {
                            setTxTypeFilter('native');
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            txTypeFilter === 'native'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          ETH ({summary.native_tx_count})
                        </button>
                        <button
                          onClick={() => {
                            setTxTypeFilter('erc20');
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            txTypeFilter === 'erc20'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          ERC-20 ({summary.erc20_transfer_count})
                        </button>
                      </div>

                      {/* Export CSV Button */}
                      <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Table with Clear, Readable Type */}
                  <div className="rounded-2xl border border-slate-800 overflow-x-auto bg-[#060912]/80">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#090e1c] text-slate-400 font-mono uppercase text-xs tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4 font-bold">Direction</th>
                          <th className="px-6 py-4 font-bold">Transaction Hash</th>
                          <th
                            className="px-6 py-4 font-bold cursor-pointer hover:text-cyan-400 transition"
                            onClick={() => {
                              if (sortField === 'timestamp') setSortAsc(!sortAsc);
                              else {
                                setSortField('timestamp');
                                setSortAsc(false);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              Timestamp & Block
                              <ArrowUpDown className="w-4 h-4" />
                            </div>
                          </th>
                          <th className="px-6 py-4 font-bold">From</th>
                          <th className="px-6 py-4 font-bold">To</th>
                          <th
                            className="px-6 py-4 font-bold text-right cursor-pointer hover:text-cyan-400 transition"
                            onClick={() => {
                              if (sortField === 'value') setSortAsc(!sortAsc);
                              else {
                                setSortField('value');
                                setSortAsc(false);
                              }
                            }}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              Value / Asset
                              <ArrowUpDown className="w-4 h-4" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono text-sm">
                        {paginatedTransactions.map((tx) => {
                          const isTargetSender = tx.from_address.toLowerCase() === activeInvestigation.target_address.toLowerCase();
                          return (
                            <tr key={tx.id} className="hover:bg-slate-800/50 transition">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isTargetSender ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-rose-950/80 text-rose-300 border border-rose-800/80 shadow-sm">
                                    <ArrowUpRight className="w-4 h-4 text-rose-400" /> OUT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-sm">
                                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> IN
                                  </span>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100">
                                    {tx.transaction_hash.slice(0, 10)}...{tx.transaction_hash.slice(-8)}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(tx.transaction_hash)}
                                    className="p-1 rounded text-slate-500 hover:text-cyan-400 transition"
                                    title="Copy Hash"
                                  >
                                    {copiedText === tx.transaction_hash ? (
                                      <Check className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                  <a
                                    href={`https://etherscan.io/tx/${tx.transaction_hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded text-slate-500 hover:text-cyan-400 transition"
                                    title="Inspect on Etherscan"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                <div className="font-semibold text-slate-200">
                                  {new Date(tx.timestamp * 1000).toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-500">Block #{tx.block_number}</div>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={isTargetSender ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                  {tx.from_address.slice(0, 6)}...{tx.from_address.slice(-4)}
                                </span>
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                {tx.to_address ? (
                                  <span className={!isTargetSender ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                                    {tx.to_address.slice(0, 6)}...{tx.to_address.slice(-4)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">Contract Deploy</span>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="font-extrabold text-white text-base">
                                  {tx.display_value != null ? Number(tx.display_value).toFixed(4) : tx.raw_value}{' '}
                                  <span className="text-cyan-400 font-bold">{tx.asset_symbol || 'ETH'}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {paginatedTransactions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-16 text-slate-500 text-sm">
                              No records match current filter or search criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination & Counter */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-sm text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedTransactions.length)} of {processedTransactions.length} records</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold transition"
                      >
                        Previous
                      </button>
                      <span className="px-3 font-bold text-white">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COUNTERPARTY NETWORK VIEW */}
              {activeTab === 'counterparties' && (
                <div className="p-7 space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-white">Direct Interacting Counterparties</h4>
                    <p className="text-sm text-slate-400">
                      Ranked by interaction volume. Click any counterparty card to immediately pivot your investigation to that wallet.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {topCounterparties.map((cp, idx) => (
                      <div
                        key={cp.address}
                        className="rounded-2xl border border-slate-800/90 bg-[#060913]/90 p-5 space-y-4 hover:border-cyan-400/60 transition group shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                            Rank #{idx + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800">
                            {cp.txCount} Interactions
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-mono">Counterparty Address</div>
                          <div className="font-mono text-base font-bold text-white flex items-center justify-between">
                            <span>{cp.address.slice(0, 10)}...{cp.address.slice(-8)}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleCopy(cp.address)}
                                className="p-1 rounded text-slate-400 hover:text-cyan-400"
                                title="Copy"
                              >
                                {copiedText === cp.address ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <a
                                href={`https://etherscan.io/address/${cp.address}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded text-slate-400 hover:text-cyan-400"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                          <div className="text-rose-400 font-bold">
                            Sent: {cp.ethSent.toFixed(2)} ETH
                          </div>
                          <div className="text-emerald-400 font-bold">
                            Recv: {cp.ethReceived.toFixed(2)} ETH
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setAddressInput(cp.address);
                            executeInvestigation(cp.address);
                          }}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-gradient-to-r hover:from-cyan-400 hover:to-blue-500 hover:text-slate-950 text-xs font-extrabold text-slate-200 transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Search className="w-4 h-4" />
                          Pivot Investigation to Address
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060912] px-6 py-4 text-center text-xs text-slate-500 font-mono">
        NEXUS &copy; 2026 &mdash; Ethereum Intelligence & Evidence-Based VASP Attribution &mdash; Built on Antigravity
      </footer>
    </div>
  );
}
