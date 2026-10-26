import React, { useState } from 'react';
import { useFitnessData } from '../../context/FitnessDataContext';
import { useAuth } from '../../context/AuthContext';
import { CoachMember } from '../../types';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Mail, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Award,
  ArrowLeft,
  Settings,
  CloudUpload
} from 'lucide-react';
import { seedFoundersAndCoachesToFirestore } from '../../services/firestoreService';

interface ManageCoachesPageProps {
  onNavigate?: (view: any) => void;
  onNavigateToCMS?: () => void;
}

export const ManageCoachesPage: React.FC<ManageCoachesPageProps> = ({ onNavigate, onNavigateToCMS }) => {
  const { coaches, clients, addCoach, deleteCoach } = useFitnessData();
  const { currentUser } = useAuth();

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'admin' | 'nutritionist'>('coach');
  const [specialty, setSpecialty] = useState('');
  const [maxClients, setMaxClients] = useState<number>(20);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const handleSyncToFirestore = async () => {
    setSyncLoading(true);
    setSyncSuccess(null);
    try {
      await seedFoundersAndCoachesToFirestore();
      setSyncSuccess('Staff & Founders Synced to Cloud Firestore!');
    } catch (err: any) {
      setSyncSuccess(`Sync note: ${err.message || 'Make sure Firestore rules are published'}`);
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncSuccess(null), 3500);
    }
  };

  const presetAvatars = [
    { label: 'Founder Mass (Gym)', url: '/assets/founders/mass-gym.jpg' },
    { label: 'Founder Pouya (Boxing)', url: '/assets/founders/pouya-boxing.jpg' },
    { label: 'Founder Mass (Stage)', url: '/assets/founders/mass-stage.png' },
    { label: 'Founder Pouya (Strength)', url: '/assets/founders/pouya-powerlifting.jpg' }
  ];

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Coach name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      setFormError('Portal login password must be at least 6 characters.');
      return;
    }
    if (!specialty.trim()) {
      setFormError('Please specify the coach specialty area.');
      return;
    }

    const finalAvatar = avatarUrl.trim() || presetAvatars[0].url;

    setIsSubmitting(true);
    try {
      await addCoach({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
        specialty: specialty.trim(),
        maxClients: Number(maxClients) || 20,
        activeClientsCount: 0,
        status: 'active',
        avatarUrl: finalAvatar,
        bio: bio.trim() || 'Certified elite transformation specialist.'
      });

      // Reset Form
      setName('');
      setEmail('');
      setPassword('');
      setRole('coach');
      setSpecialty('');
      setMaxClients(20);
      setAvatarUrl('');
      setBio('');
      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        setShowAddForm(false);
      }, 1800);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create coach account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalClientsCap = coaches.reduce((acc, c) => acc + c.maxClients, 0);
  const totalActiveAssigned = clients.length;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-24">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('coach_portal')}
                  className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Back to Coach Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h1 className="text-2xl font-black text-neutral-900 uppercase font-display tracking-tight flex items-center gap-2">
                <span>Manage Coaches</span>
                <span className="px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-black uppercase tracking-wider">
                  Admin Exclusive
                </span>
              </h1>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Add new coaching staff, configure roster quotas, and manage staff credentials.
            </p>
          </div>

          {/* Action button & Founder Admin Badge */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-300">
                <img
                  src={currentUser?.photoURL || '/assets/founders/mass-gym.jpg'}
                  alt={currentUser?.displayName || 'Admin'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left text-[11px] leading-tight">
                <p className="font-bold text-neutral-900">{currentUser?.displayName}</p>
                <p className="text-[9px] uppercase font-bold text-red-600">Founder &amp; Administrator</p>
              </div>
            </div>

            <button
              type="button"
              disabled={syncLoading}
              onClick={handleSyncToFirestore}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-neutral-300 disabled:opacity-50"
              title="Push Founders and Coaching Staff to Cloud Firestore"
            >
              <CloudUpload className="w-4 h-4 text-red-600" />
              <span>{syncLoading ? 'Syncing...' : 'Sync to Firestore'}</span>
            </button>

            {onNavigateToCMS && (
              <button
                onClick={onNavigateToCMS}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-neutral-800"
                title="Open Website CMS & Pricing Editor"
              >
                <Settings className="w-4 h-4 text-red-500" />
                <span>Website CMS</span>
              </button>
            )}

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'Close Form' : 'Add New Coach'}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {syncSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncSuccess}</span>
          </div>
        )}
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Active Staff</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-neutral-900 font-mono">{coaches.length} Coaches</div>
            <p className="text-[11px] text-neutral-500 mt-1">Full-time and consulting staff</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Capacity</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-neutral-900 font-mono">{totalClientsCap} Athletes</div>
            <p className="text-[11px] text-neutral-500 mt-1">Across all team rosters</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Assigned Athletes</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{totalActiveAssigned} Active</div>
            <p className="text-[11px] text-neutral-500 mt-1">Under active programming</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Staff Utilization</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-neutral-900 font-mono">
              {totalClientsCap > 0 ? Math.round((totalActiveAssigned / totalClientsCap) * 100) : 0}%
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Total system bandwidth</p>
          </div>
        </div>

        {/* Add Coach Form (Collapsible/Drawer) */}
        {showAddForm && (
          <div className="bg-white border-2 border-red-600/20 rounded-3xl p-6 sm:p-8 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-6">
              <div>
                <h2 className="text-lg font-black text-neutral-900 uppercase font-display flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-red-600" />
                  <span>Onboard New Coach</span>
                </h2>
                <p className="text-xs text-neutral-500">
                  Adds an active coach to the platform with dedicated client capacity and credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Coach registered successfully! Added to staff roster.</span>
              </div>
            )}

            <form onSubmit={handleCreateCoach} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Coach David Miller"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Staff Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. david.m@bflfitness.com"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Login Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters for portal login"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Credentials stored in Firebase Authentication for coach login.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Role Category
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none cursor-pointer"
                  >
                    <option value="coach">Fitness & Hypertrophy Coach</option>
                    <option value="admin">Platform Administrator & Coach</option>
                    <option value="nutritionist">Registered Nutritionist / Dietitian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Client Quota / Max Capacity
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={maxClients}
                    onChange={(e) => setMaxClients(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Primary Specialty & Focus *
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Powerlifting & Posture Correction or Contest Peaking"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Profile Avatar URL
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Paste image link or choose a preset below"
                      className="flex-1 w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      {presetAvatars.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(p.url)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Staff Bio & Accreditations
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Certification background, past coaching experience, athletic background..."
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs focus:bg-white focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Provisioning Firebase Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Save & Deploy Coach</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Coaches Staff Table */}
        <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-neutral-900 uppercase font-display">
                Active Staff Directory
              </h2>
              <p className="text-xs text-neutral-500">
                Coaches eligible for client assignment in the Client Management table.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200 self-start sm:self-auto">
              {coaches.length} Staff Members Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-black uppercase tracking-wider text-neutral-500">
                  <th className="py-3.5 px-6">Coach Name</th>
                  <th className="py-3.5 px-6">Role & Specialty</th>
                  <th className="py-3.5 px-6">Contact Email</th>
                  <th className="py-3.5 px-6">Client Load</th>
                  <th className="py-3.5 px-6">Joined</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {coaches.map((coach) => {
                  const realAssignedCount = clients.filter(c => (c.coachId || c.assignedCoachId) === coach.id).length;
                  const activeCount = realAssignedCount > 0 ? realAssignedCount : coach.activeClientsCount;
                  const percentCapacity = Math.round((activeCount / coach.maxClients) * 100);
                  const isSelf = currentUser?.id === coach.id || currentUser?.email === coach.email;

                  return (
                    <tr key={coach.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={coach.avatarUrl}
                            alt={coach.name}
                            className="w-11 h-11 rounded-xl object-cover border border-neutral-200 shadow-sm"
                          />
                          <div>
                            <div className="font-bold text-neutral-900 flex items-center gap-2">
                              <span>{coach.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 line-clamp-1 max-w-xs">{coach.bio}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mb-1 ${
                          coach.role === 'admin'
                            ? 'bg-neutral-900 text-white border border-neutral-800'
                            : coach.role === 'nutritionist'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {coach.role === 'admin' ? 'Founder & Admin' : coach.role === 'nutritionist' ? 'Nutritionist' : 'Coach'}
                        </span>
                        <p className="text-[11px] text-neutral-700 font-medium">{coach.specialty}</p>
                      </td>

                      <td className="py-4 px-6 font-mono text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{coach.email}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                            <span className="font-bold text-neutral-800">{activeCount} / {coach.maxClients}</span>
                            <span className="text-neutral-500">{percentCapacity}%</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentCapacity > 85 ? 'bg-red-600' : 'bg-neutral-800'
                              }`}
                              style={{ width: `${Math.min(percentCapacity, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-neutral-500 text-[11px] font-mono whitespace-nowrap">
                        {coach.joinedDate}
                      </td>

                      <td className="py-4 px-6 text-right">
                        {coach.role === 'admin' || coach.id === 'admin_mass_narimanian' || coach.id === 'admin_pouya_marghzari' ? (
                          <span className="text-[10px] uppercase font-bold text-neutral-700 bg-neutral-100 border border-neutral-300 px-2 py-1 rounded-md">
                            Founder &amp; Admin
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${coach.name} from the coaching staff?`)) {
                                deleteCoach(coach.id);
                              }
                            }}
                            className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Coach"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
