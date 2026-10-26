import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Award, 
  Mail, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Trash2, 
  ArrowRightLeft,
  Briefcase,
  CloudUpload
} from 'lucide-react';
import { useFitnessData } from '../../context/FitnessDataContext';
import { CoachMember } from '../../types';
import { seedFoundersAndCoachesToFirestore } from '../../services/firestoreService';

export const CoachTeamManagement: React.FC = () => {
  const { coaches, addCoach, updateCoach, deleteCoach, clients, assignCoachToClient } = useFitnessData();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);

  // New Coach Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'coach' | 'nutritionist'>('coach');
  const [specialty, setSpecialty] = useState('');
  const [maxClients, setMaxClients] = useState(25);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');

  // Reassignment Form State
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedCoachId, setSelectedCoachId] = useState(coaches[0]?.id || '');
  const [reassignSuccess, setReassignSuccess] = useState('');

  const handleAddCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    addCoach({
      name,
      email,
      role,
      specialty: specialty || 'General Hypertrophy & Physique Prep',
      activeClientsCount: 0,
      maxClients: Number(maxClients) || 25,
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      status: 'active',
      bio: bio || 'Certified fitness coach specializing in customized periodization.'
    });

    setName('');
    setEmail('');
    setRole('coach');
    setSpecialty('');
    setMaxClients(25);
    setAvatarUrl('');
    setBio('');
    setShowAddModal(false);
  };

  const handleReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedCoachId) return;

    assignCoachToClient(selectedClientId, selectedCoachId);
    const client = clients.find(c => c.id === selectedClientId);
    const coach = coaches.find(co => co.id === selectedCoachId);
    setReassignSuccess(`Assigned ${client?.name} to ${coach?.name}`);
    setTimeout(() => {
      setReassignSuccess('');
      setShowReassignModal(false);
    }, 1200);
  };

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

  return (
    <div className="space-y-6">
      {syncSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-neutral-900 tracking-tight font-display">
              Multi-Coach Staff & Scaling
            </h2>
            <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold uppercase rounded-md tracking-wider">
              {coaches.length} Active Staff
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-1">
            Manage your coaching team, assign client quotas, invite assistant coaches, and delegate rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={syncLoading}
            onClick={handleSyncToFirestore}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Push Founders and Coaching Staff to Cloud Firestore"
          >
            <CloudUpload className="w-4 h-4 text-red-500" />
            <span>{syncLoading ? 'Syncing...' : 'Sync to Firestore'}</span>
          </button>
          <button
            id="reassign-client-btn"
            onClick={() => setShowReassignModal(true)}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold border border-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-neutral-600" />
            <span>Reassign Client</span>
          </button>
          <button
            id="add-coach-btn"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition-all flex items-center gap-1.5 border border-red-500 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Coach</span>
          </button>
        </div>
      </div>

      {/* Coaches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {coaches.map((coach) => {
          // Count assigned clients
          const assignedClients = clients.filter(c => c.assignedCoachId === coach.id);
          const activeCount = assignedClients.length || coach.activeClientsCount;
          const capacityPercent = Math.min(100, Math.round((activeCount / coach.maxClients) * 100));

          return (
            <div
              key={coach.id}
              className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-300 shadow-sm transition-colors"
            >
              <div>
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={coach.avatarUrl}
                      alt={coach.name}
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-200"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                        {coach.name}
                        {coach.role === 'admin' && (
                          <span title="Founder & Admin">
                            <ShieldCheck className="w-4 h-4 text-red-600" />
                          </span>
                        )}
                      </h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {coach.role === 'admin' ? 'Founder & Admin' : coach.role === 'nutritionist' ? 'Sports Dietitian' : 'Coach'}
                      </span>
                    </div>
                  </div>

                  {coach.role !== 'admin' && coach.id !== 'admin_mass_narimanian' && coach.id !== 'admin_pouya_marghzari' && (
                    <button
                      onClick={() => deleteCoach(coach.id)}
                      className="text-neutral-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                      title="Remove Coach"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Specialty & Bio */}
                <div className="space-y-2 mb-4 text-xs">
                  <div className="text-neutral-800 font-semibold flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{coach.specialty}</span>
                  </div>
                  <div className="text-neutral-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="truncate">{coach.email}</span>
                  </div>
                  <p className="text-neutral-600 text-xs leading-relaxed pt-1 line-clamp-3">
                    {coach.bio}
                  </p>
                </div>
              </div>

              {/* Client Capacity Bar */}
              <div className="pt-4 border-t border-neutral-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-600 font-medium">Roster Capacity</span>
                  <span className="font-bold text-neutral-900">
                    {activeCount} / {coach.maxClients} clients
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden border border-neutral-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      capacityPercent > 85 ? 'bg-amber-500' : 'bg-red-600'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
                  <span>Joined {coach.joinedDate}</span>
                  <span className="text-emerald-600 font-bold uppercase">● {coach.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Coach */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-neutral-900">Add Coach to BFL Staff</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCoach} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Coach Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Coach Jordan Hayes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jordan.bfl@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Staff Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                  >
                    <option value="coach">Fitness & Strength Coach</option>
                    <option value="nutritionist">Registered Sports Dietitian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Max Client Capacity
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={maxClients}
                    onChange={(e) => setMaxClients(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Primary Specialty
                </label>
                <input
                  type="text"
                  placeholder="e.g. Powerlifting & Squat/Deadlift Mechanics"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Avatar / Photo URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80')}
                  className="text-[10px] text-red-600 hover:underline mt-1 cursor-pointer font-semibold"
                >
                  Use Sample Coach Avatar
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Biography & Qualifications
                </label>
                <textarea
                  rows={3}
                  placeholder="CSCS certified, 8 years competitive lifting experience..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md shadow-red-500/20 transition-all cursor-pointer"
                >
                  Add Coach to Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reassign Client */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-neutral-900">Reassign Client</h3>
              </div>
              <button onClick={() => setShowReassignModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reassignSuccess ? (
              <div className="p-6 text-center text-emerald-600 font-bold flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8" />
                <p>{reassignSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleReassign} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Select Client
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.planName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Assign To Coach
                  </label>
                  <select
                    value={selectedCoachId}
                    onChange={(e) => setSelectedCoachId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-red-600 focus:bg-white focus:outline-none"
                  >
                    {coaches.map(co => (
                      <option key={co.id} value={co.id}>
                        {co.name} - {co.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowReassignModal(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-md shadow-red-500/20 transition-all cursor-pointer"
                  >
                    Confirm Reassignment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
