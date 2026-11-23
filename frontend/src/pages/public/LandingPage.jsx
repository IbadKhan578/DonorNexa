import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, ArrowRight, ShieldCheck, Heart, Clock, Activity, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';
import Logo from '../../components/common/Logo';
import BloodChip from '../../components/common/BloodChip';
import StatusBadge from '../../components/common/StatusBadge';
import CountdownTimer from '../../components/common/CountdownTimer';

export default function LandingPage() {
  const [stats, setStats] = useState({
    active_requests: 42,
    registered_donors: 1284,
    units_fulfilled: 286,
    verified_hospitals: 14,
  });
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, emergRes] = await Promise.all([
          api.get('/public/stats'),
          api.get('/public/emergencies')
        ]);
        if (statsRes.data && typeof statsRes.data === 'object' && !Array.isArray(statsRes.data)) {
          setStats(statsRes.data);
        }
        if (Array.isArray(emergRes.data)) {
          setEmergencies(emergRes.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching landing page data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-[#E0DACF] px-6 md:px-12 flex items-center justify-between sticky top-0 z-30">
        <Logo />

        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#524E47]">
          <Link to="/emergencies" className="flex items-center gap-1.5 text-[#B3202A] font-semibold hover:opacity-80">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Active emergencies</span>
          </Link>
          <a href="#how-it-works" className="hover:text-[#1B1A18] transition-colors">How it works</a>
          <a href="#stats" className="hover:text-[#1B1A18] transition-colors">Impact</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="btn bs sm">
            Sign in
          </Link>
          <Link to="/register/donor" className="btn bp sm hidden sm:inline-flex">
            Register as donor
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#FBE8E5] text-[#B3202A] text-xs font-semibold w-max border border-[#B3202A]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B3202A]"></span>
              Pakistan Emergency Blood Coordination Portal
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-[54px] font-serif font-semibold leading-[1.12] text-[#1B1A18] tracking-tight">
              The right blood group. The right donor. Before the clock runs out.
            </h1>

            <p className="text-[#524E47] text-base md:text-lg leading-relaxed max-w-xl">
              Ranked, privacy-first coordination connecting verified hospitals across Pakistan directly with eligible donors. No repeated calls, no exposed numbers, zero wasted minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link to="/register/donor" className="btn bp h-12 px-6 text-base">
                Register as a donor
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/register/hospital" className="btn bs h-12 px-6 text-base">
                Register a hospital
              </Link>
              <Link to="/emergencies" className="btn bg h-12 px-4 text-base text-[#1F5F5B]">
                View live board →
              </Link>
            </div>
          </div>

          {/* Live on the board preview widget */}
          <div className="md:col-span-5 bg-[#1B1A18] text-[#F6F3EE] rounded-xl p-6 shadow-xl border border-[#2A2825]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2825] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#B3202A] animate-ping"></span>
                <span className="text-xs uppercase tracking-wider font-semibold text-[#BDB6A8]">
                  Live on the board
                </span>
              </div>
              <Link to="/emergencies" className="text-xs text-[#BDB6A8] hover:text-white underline">
                View all ({stats.active_requests})
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {emergencies.length > 0 ? (
                emergencies.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-3 py-3 border-b border-[#2A2825] last:border-0"
                  >
                    <BloodChip group={req.blood_group} size="sm" />
                    <div className="flex-1 min-w-0">
                      <b className="block text-sm font-semibold truncate text-[#F6F3EE]">
                        {req.blood_group} · {req.city_name}
                      </b>
                      <small className="text-xs text-[#BDB6A8] truncate block">
                        {req.hospital_name}
                      </small>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <StatusBadge status={req.urgency} solid={req.urgency === 'critical'} />
                      <CountdownTimer targetDate={req.required_by} isCritical={req.urgency === 'critical'} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-[#BDB6A8]">
                  Loading active emergencies...
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#2A2825] flex justify-between items-center text-xs text-[#BDB6A8]">
              <span>Privacy protected · Patient names hidden</span>
              <span className="font-mono text-white">Asia/Karachi (PKT)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Aggregated Statistics Bar */}
      <section id="stats" className="border-y border-[#E0DACF] bg-white py-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-serif font-semibold text-4xl md:text-5xl text-[#B3202A] mb-1">
              {stats.active_requests}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#6F6A61]">
              Active requests
            </div>
            <span className="text-xs text-[#524E47] mt-1 block">Live across Pakistan</span>
          </div>

          <div>
            <div className="font-serif font-semibold text-4xl md:text-5xl text-[#1B1A18] mb-1">
              {stats.registered_donors}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#6F6A61]">
              Registered donors
            </div>
            <span className="text-xs text-[#524E47] mt-1 block">Verified & fair rotation</span>
          </div>

          <div>
            <div className="font-serif font-semibold text-4xl md:text-5xl text-[#1F5F5B] mb-1">
              {stats.units_fulfilled}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#6F6A61]">
              Units fulfilled
            </div>
            <span className="text-xs text-[#524E47] mt-1 block">Tracked blood units</span>
          </div>

          <div>
            <div className="font-serif font-semibold text-4xl md:text-5xl text-[#1B1A18] mb-1">
              {stats.verified_hospitals}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#6F6A61]">
              Verified hospitals
            </div>
            <span className="text-xs text-[#524E47] mt-1 block">Regulated healthcare centres</span>
          </div>
        </div>
      </section>

      {/* How it works - User flows */}
      <section id="how-it-works" className="py-20 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <small className="font-semibold text-xs uppercase tracking-widest text-[#B3202A] block mb-2">
            The Coordination Loop
          </small>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#1B1A18]">
            Four roles. One unified lifecycle.
          </h2>
          <p className="text-[#524E47] mt-3 text-base">
            Engineered to eliminate WhatsApp broadcasts, protect donor privacy, and prevent over-allocation.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Guest */}
          <div className="card p-6 gap-4 border-[#E0DACF]">
            <div className="w-10 h-10 rounded-md bg-[#FBE8E5] text-[#B3202A] flex items-center justify-center font-serif font-semibold text-lg">
              1
            </div>
            <h3 className="text-lg font-semibold text-[#1B1A18]">Public Visitor</h3>
            <ul className="text-xs text-[#524E47] space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>View emergency requests with countdowns.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Zero exposed patient names or ward details.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Register as an eligible donor in 60 seconds.</span>
              </li>
            </ul>
          </div>

          {/* Hospital */}
          <div className="card p-6 gap-4 border-[#E0DACF]">
            <div className="w-10 h-10 rounded-md bg-[#E1EFEC] text-[#1F5F5B] flex items-center justify-center font-serif font-semibold text-lg">
              2
            </div>
            <h3 className="text-lg font-semibold text-[#1B1A18]">Verified Hospital</h3>
            <ul className="text-xs text-[#524E47] space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Create requests (capped at 3 open Critical).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>View ranked donor pool with masked phones.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Complete donation to update inventory automatically.</span>
              </li>
            </ul>
          </div>

          {/* Donor */}
          <div className="card p-6 gap-4 border-[#E0DACF]">
            <div className="w-10 h-10 rounded-md bg-[#FBE8E5] text-[#B3202A] flex items-center justify-center font-serif font-semibold text-lg">
              3
            </div>
            <h3 className="text-lg font-semibold text-[#1B1A18]">Eligible Donor</h3>
            <ul className="text-xs text-[#524E47] space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Notified only when blood group & city match.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Phone is hidden until you choose to accept.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>90-day fair cooldown enforced automatically.</span>
              </li>
            </ul>
          </div>

          {/* Admin */}
          <div className="card p-6 gap-4 border-[#E0DACF]">
            <div className="w-10 h-10 rounded-md bg-[#EDE8E0] text-[#1B1A18] flex items-center justify-center font-serif font-semibold text-lg">
              4
            </div>
            <h3 className="text-lg font-semibold text-[#1B1A18]">Platform Admin</h3>
            <ul className="text-xs text-[#524E47] space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Verify hospital medical licence documents.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Monitor blood demand vs available supply.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1F5F5B] flex-shrink-0 mt-0.5" />
                <span>Immutable audit trail and CSV dataset exports.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E0DACF] bg-white py-12 px-6 md:px-12 text-[#6F6A61] text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 items-center md:items-start">
            <Logo size="sm" />
            <p className="text-[11px] text-[#6F6A61] mt-1">
              Connecting Donors. Bridging Lives. Saving Hope.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/emergencies" className="hover:text-[#1B1A18]">Public emergencies board</Link>
            <Link to="/register/donor" className="hover:text-[#1B1A18]">Become a donor</Link>
            <Link to="/register/hospital" className="hover:text-[#1B1A18]">Hospital registration</Link>
            <Link to="/login" className="hover:text-[#1B1A18]">Sign in</Link>
          </div>

          <div>
            <span>Localized for Pakistan · Asia/Karachi (PKT)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
