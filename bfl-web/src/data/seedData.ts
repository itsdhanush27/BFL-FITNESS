import { 
  CoachingPlan, 
  Exercise, 
  WorkoutTemplate, 
  AssignedWorkout, 
  WeeklyCheckIn, 
  NutritionPlan, 
  ChatMessage, 
  CMSContent, 
  ClientRosterItem,
  InAppNotification,
  CoachMember,
  ProgressMetricPoint,
  ProgressPhotoRecord
} from '../types';

export const INITIAL_CLIENTS: ClientRosterItem[] = [
  {
    id: 'client_alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    planName: '1-on-1 Elite Coaching',
    adherenceRate: 96,
    joinedDate: 'Jan 15, 2026',
    primaryGoal: 'Recomposition & Clavicular Upper Chest Hypertrophy',
    startingWeightKg: 84.5,
    currentWeightKg: 81.2,
    targetWeightKg: 78.0,
    injuryNotes: 'Mild right shoulder impingement with wide bench grip. Using neutral dumbbell press and warm-up band dislocations.',
    daysPerWeek: 4,
    availableEquipment: ['Commercial Gym', 'Barbells', 'Cables', 'Dumbbells', 'Squat Rack'],
    assignedCoachId: 'admin_mass_narimanian',
    coachId: 'admin_mass_narimanian'
  },
  {
    id: 'client_jordan',
    name: 'Jordan Lee',
    email: 'jordan.lee@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    planName: 'Performance & Lifestyle',
    adherenceRate: 88,
    joinedDate: 'Feb 01, 2026',
    primaryGoal: 'Fat Loss & Athletic Conditioning',
    startingWeightKg: 79.0,
    currentWeightKg: 74.6,
    targetWeightKg: 72.0,
    injuryNotes: 'Prior lumbar strain, preferring safety-bar squats and leg press.',
    daysPerWeek: 3,
    availableEquipment: ['Commercial Gym', 'Machines', 'Dumbbells'],
    assignedCoachId: 'admin_pouya_marghzari',
    coachId: 'admin_pouya_marghzari'
  },
  {
    id: 'client_david',
    name: 'David Chen',
    email: 'david.c@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    planName: 'Contest Prep & Recomp',
    adherenceRate: 98,
    joinedDate: 'Dec 10, 2025',
    primaryGoal: 'Sub-10% Body Fat Stage Peaking',
    startingWeightKg: 88.0,
    currentWeightKg: 82.0,
    targetWeightKg: 79.5,
    injuryNotes: 'None reported. 100% biomechanical clearance for all compound lifts.',
    daysPerWeek: 5,
    availableEquipment: ['Commercial Gym', 'Full Free Weights', 'Cardio Suite'],
    assignedCoachId: 'admin_mass_narimanian',
    coachId: 'admin_mass_narimanian'
  },
  {
    id: 'client_sophia',
    name: 'Sophia Lin',
    email: 'sophia.lin@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    planName: 'Female Physique Sculpting',
    adherenceRate: 94,
    joinedDate: 'Jan 28, 2026',
    primaryGoal: 'Glute Hypertrophy & Waist Tapering',
    startingWeightKg: 62.0,
    currentWeightKg: 59.4,
    targetWeightKg: 58.0,
    injuryNotes: 'None. Prefers RDLs and hip thrusts with barbell pad.',
    daysPerWeek: 4,
    availableEquipment: ['Commercial Gym', 'Barbells', 'Cables', 'Machines'],
    assignedCoachId: 'admin_pouya_marghzari',
    coachId: 'admin_pouya_marghzari'
  }
];

export const INITIAL_COACHING_PLANS: CoachingPlan[] = [
  {
    id: 'plan_f2f_hourly',
    name: 'Face-to-Face 1-on-1 (Hourly)',
    tagline: 'Private in-person coaching session for biomechanics, lifting technique & intensity',
    price: 80,
    period: '/ hour',
    category: 'face_to_face',
    billingCycle: 'hourly',
    features: [
      '60 minutes of intensive 1-on-1 private gym coaching',
      'Hands-on biomechanics audit & neuromuscular cueing',
      'Real-time form correction & progressive overload guidance',
      'Custom warm-up & movement prep optimization',
      'Post-session technique review and exercise recommendations'
    ],
    idealFor: 'Lifters looking for in-person technique mastery, PR attempts, or hands-on coaching',
    spotsLeft: 8
  },
  {
    id: 'plan_f2f_weekly',
    name: 'Face-to-Face Coaching (Weekly)',
    tagline: 'Hands-on weekly training block with in-person sessions & full diet oversight',
    price: 390,
    period: '/ week',
    category: 'face_to_face',
    billingCycle: 'weekly',
    features: [
      'Weekly in-person coaching sessions at private gym facility',
      'Full individualized nutrition & macro blueprint',
      'Complete weekly workout routine tailored to your split',
      'Hands-on lifting technique coaching & spot assistance',
      'Direct in-app messaging & daily accountability'
    ],
    idealFor: 'Clients demanding in-person guidance combined with structured weekly nutrition',
    spotsLeft: 4
  },
  {
    id: 'plan_f2f_monthly',
    name: 'Face-to-Face Coaching (Monthly VIP)',
    tagline: 'Elite all-inclusive in-person coaching, hands-on gym training & full nutrition system',
    price: 1500,
    period: '/ month',
    category: 'face_to_face',
    billingCycle: 'monthly',
    features: [
      'Dedicated in-person gym coaching sessions throughout the month',
      'Full bespoke nutrition planning, weekly adjustments & diet breaks',
      'Periodized hypertrophy & strength programming in BFL app',
      'Hands-on execution of heavy compound lifts & intensity techniques',
      '24/7 direct coach priority line & lifestyle accountability',
      'Ongoing body composition & progress tracking audits'
    ],
    idealFor: 'VIP executives and athletes seeking maximum in-person results & accountability',
    spotsLeft: 2
  },
  {
    id: 'plan_online_weekly',
    name: 'Online Coaching (Weekly)',
    tagline: 'Full customized nutrition, bespoke exercise program, and weekly audits',
    price: 99,
    period: '/ week',
    category: 'online',
    billingCycle: 'weekly',
    features: [
      'Full customized diet & macro prescription',
      'Full exercise programming tailored to your equipment',
      'Weekly biofeedback check-ins & video lift audit',
      'In-app set logging & progressive overload tracking',
      'Direct messaging with coach (response within 24h)'
    ],
    idealFor: 'Athletes wanting complete online nutrition & training guidance with weekly flexibility',
    spotsLeft: 5
  },
  {
    id: 'plan_online_monthly',
    name: 'Online Coaching (Monthly)',
    tagline: 'Complete periodized physique transformation, bespoke nutrition & progressive overload',
    price: 350,
    period: '/ month',
    popular: true,
    category: 'online',
    billingCycle: 'monthly',
    features: [
      'Full bespoke nutrition protocol & flexible dieting guidelines',
      'Full periodized monthly workout programming',
      'Weekly comprehensive video check-ins & biofeedback audits',
      'Unlimited video form analysis & lifting technique reviews',
      'Priority direct 1-on-1 coach chat (response within 4h)',
      'Cardio, step count, and recovery optimization'
    ],
    idealFor: 'Dedicated lifters committed to sustainable, elite monthly body recomposition',
    spotsLeft: 3
  },
  {
    id: 'plan_boxing_f2f',
    name: 'Boxing 1-on-1 (Face-to-Face)',
    tagline: 'Authentic competitive boxing instruction, pad work, and athletic conditioning',
    price: 80,
    period: '/ hour',
    category: 'boxing',
    billingCycle: 'hourly',
    features: [
      '60 minutes of 1-on-1 face-to-face boxing instruction',
      'Pad work, combination drills & kinetic punching mechanics',
      'Footwork, head movement & defensive positioning',
      'High-intensity combat conditioning & core endurance',
      'Led by Founder & competitive boxing specialist Pouya Marghzari'
    ],
    idealFor: 'All levels: from beginners learning proper technique to advanced combat athletes',
    spotsLeft: 6
  },
  {
    id: 'plan_powerlifting',
    name: 'Powerlifting SBD Coaching',
    tagline: 'Raw strength peaking, bar-speed mechanics & competition preparation (F2F or Online)',
    price: 80,
    period: '/ hour',
    category: 'powerlifting',
    billingCycle: 'hourly',
    features: [
      'Face-to-Face SBD technical session: $80 / hour',
      'Weekly Online Coaching option: $99 / week (Full Diet & Exercise)',
      'Monthly Full Peaking option: $350 / month',
      'In-depth video velocity & bar-path mechanics analysis',
      'Meet-day peaking, attempt selection & taper protocols'
    ],
    idealFor: 'Powerlifters, strength athletes, and lifters aiming to maximize their 1RM totals',
    spotsLeft: 4
  }
];

export const INITIAL_EXERCISES: Exercise[] = [
  {
    id: 'ex_1',
    name: 'Barbell Back Squat',
    category: 'gym',
    targetMuscleGroup: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Core'],
    equipment: 'Barbell',
    cues: [
      'Set bar on upper traps/rear delts with a firm grip.',
      'Brace core using the Valsalva maneuver into your belt.',
      'Break at hips and knees simultaneously, descending to at least parallel.',
      'Drive aggressively through the midfoot while keeping chest upright.'
    ],
    videoUrl: '/assets/founders/videos/mass-training-2.mp4',
    difficulty: 'Advanced'
  },
  {
    id: 'ex_2',
    name: 'Incline Dumbbell Bench Press',
    category: 'gym',
    targetMuscleGroup: 'Chest',
    secondaryMuscles: ['Shoulders', 'Arms'],
    equipment: 'Dumbbell',
    cues: [
      'Set bench to a 30-degree incline to target clavicular pectoralis.',
      'Retract and depress scapulae, keeping feet firmly planted.',
      'Lower dumbbells under control with elbows tucked at roughly 45–60 degrees.',
      'Press up and inward without banging weights at the top lockout.'
    ],
    videoUrl: '/assets/founders/videos/mass-training-1.mp4',
    difficulty: 'Intermediate'
  },
  {
    id: 'ex_3',
    name: 'Romanian Deadlift (RDL)',
    category: 'gym',
    targetMuscleGroup: 'Hamstrings',
    secondaryMuscles: ['Glutes', 'Back'],
    equipment: 'Barbell',
    cues: [
      'Maintain a soft knee bend without increasing knee flexion during hinge.',
      'Push hips back toward the wall behind you while keeping lats locked tight.',
      'Lower barbell until a deep stretch is felt in hamstrings (mid-shin level).',
      'Contract glutes and hamstrings to return to vertical lockout.'
    ],
    videoUrl: '/assets/founders/videos/pouya-training-2.mp4',
    difficulty: 'Intermediate'
  },
  {
    id: 'ex_4',
    name: 'Lat Pulldown (Neutral Grip)',
    category: 'gym',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Arms'],
    equipment: 'Cable',
    cues: [
      'Lock thighs securely under the pads.',
      'Initiate pull by depressing the scapulae before bending elbows.',
      'Pull elbows down to your hip pockets, driving chest toward the ceiling.',
      'Control the eccentric for a 3-second full stretch at top.'
    ],
    videoUrl: '/assets/founders/videos/mass-training-2.mp4',
    difficulty: 'Beginner'
  },
  {
    id: 'ex_5',
    name: 'Standing Dumbbell Lateral Raise',
    category: 'gym',
    targetMuscleGroup: 'Shoulders',
    secondaryMuscles: ['Arms'],
    equipment: 'Dumbbell',
    cues: [
      'Hinge forward slightly (10–15 degrees) at the hips.',
      'Lead with elbows and raise dumbbells in the scapular plane (30 deg forward).',
      'Pause for a fraction of a second at shoulder height.',
      'Lower with control; avoid swinging or using torso momentum.'
    ],
    videoUrl: '/assets/founders/videos/pouya-training.mp4',
    difficulty: 'Beginner'
  },
  {
    id: 'ex_6',
    name: 'Bulgarian Split Squat',
    category: 'gym',
    targetMuscleGroup: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'Dumbbell',
    cues: [
      'Elevate rear foot on bench with laces down.',
      'Slight forward torso lean places higher bias on glute max and quads.',
      'Descend until rear knee is hovering 1-2 inches off the floor.',
      'Drive through lead heel and midfoot to return to top.'
    ],
    videoUrl: '/assets/founders/videos/pouya-training-2.mp4',
    difficulty: 'Intermediate'
  },
  {
    id: 'ex_7',
    name: 'Seated Cable Row',
    category: 'gym',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Arms', 'Shoulders'],
    equipment: 'Cable',
    cues: [
      'Sit tall with knees slightly bent and feet braced on platform.',
      'Allow shoulder blades to protract forward during eccentric for maximum lat stretch.',
      'Drive elbows backward hugging ribcage, squeezing rhomboids at contraction.'
    ],
    videoUrl: '/assets/founders/videos/mass-training-2.mp4',
    difficulty: 'Beginner'
  },
  {
    id: 'ex_8',
    name: 'Barbell Overhead Press (OHP)',
    category: 'gym',
    targetMuscleGroup: 'Shoulders',
    secondaryMuscles: ['Arms', 'Core'],
    equipment: 'Barbell',
    cues: [
      'Rack bar at collarbone level with forearms vertical.',
      'Squeeze glutes and brace core to avoid lumbar hyper-extension.',
      'Pull chin back as bar passes face, then push head through window at lockout.'
    ],
    videoUrl: '/assets/founders/videos/mass-training-1.mp4',
    difficulty: 'Advanced'
  },
  {
    id: 'ex_9',
    name: 'Cable Triceps Rope Pushdown',
    category: 'gym',
    targetMuscleGroup: 'Arms',
    secondaryMuscles: [],
    equipment: 'Cable',
    cues: [
      'Pin upper arms to sides and lean torso slightly forward.',
      'Extend forearms downward, spreading rope ends apart at the bottom.',
      'Isolate the lateral and long heads without letting elbows flare forward.'
    ],
    videoUrl: '/assets/founders/videos/mass-training-1.mp4',
    difficulty: 'Beginner'
  },
  {
    id: 'ex_10',
    name: 'Incline Dumbbell Bicep Curl',
    category: 'gym',
    targetMuscleGroup: 'Arms',
    secondaryMuscles: [],
    equipment: 'Dumbbell',
    cues: [
      'Set bench to a 45-60 degree incline.',
      'Let arms hang down into full long-head bicep stretch.',
      'Supinate wrists as you curl, keeping elbows stationary behind torso.'
    ],
    videoUrl: '/assets/founders/videos/mass-training-1.mp4',
    difficulty: 'Beginner'
  },
  {
    id: 'ex_11',
    name: 'Hanging Leg Raise',
    category: 'gym',
    targetMuscleGroup: 'Core',
    secondaryMuscles: ['Glutes'],
    equipment: 'Bodyweight',
    cues: [
      'Hang from pull-up bar with overhand grip and engaged shoulders.',
      'Posteriorly tilt pelvis to initiate curl before raising legs.',
      'Bring toes to eye level without using swing momentum.'
    ],
    videoUrl: '/assets/founders/videos/pouya-training.mp4',
    difficulty: 'Intermediate'
  },
  {
    id: 'ex_12',
    name: 'Thoracic Spine Foam Roll & Extension',
    category: 'mobility',
    targetMuscleGroup: 'Back',
    secondaryMuscles: ['Shoulders'],
    equipment: 'Bodyweight',
    cues: [
      'Place foam roller horizontally under mid-back.',
      'Support neck with hands and gently extend backward over roller.',
      'Breathe deeply into ribcage and perform 8-10 slow extensions.'
    ],
    videoUrl: '/assets/founders/videos/pouya-training.mp4',
    difficulty: 'Beginner'
  }
];

export const INITIAL_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tpl_ppl_push',
    name: 'Hypertrophy Block: Push Focus (A)',
    category: 'Push / Pull / Legs',
    description: 'Chest, front/side deltoids, and tricep stimulus with progressive overload tracking',
    daysPerWeek: 4,
    weeksDuration: 6,
    workouts: [
      {
        dayName: 'Day 1',
        title: 'Push Hypertrophy & Deltoid Width',
        exercises: [
          {
            exerciseId: 'ex_2',
            exerciseName: 'Incline Dumbbell Bench Press',
            targetMuscle: 'Chest',
            equipment: 'Dumbbell',
            videoUrl: '/assets/founders/videos/mass-training-1.mp4',
            restSeconds: 120,
            coachNotes: 'Heavy working sets. Aim for 2 RIR on the final set.',
            sets: [
              { setNumber: 1, targetReps: '8-10', actualReps: 10, targetWeightKg: 32, actualWeightKg: 32, completed: true, previousSession: { weightKg: 30, reps: 10 } },
              { setNumber: 2, targetReps: '8-10', actualReps: 9, targetWeightKg: 32, actualWeightKg: 32, completed: true, previousSession: { weightKg: 30, reps: 9 } },
              { setNumber: 3, targetReps: '8-10', actualReps: 8, targetWeightKg: 34, actualWeightKg: 34, completed: false, previousSession: { weightKg: 32, reps: 8 } }
            ]
          },
          {
            exerciseId: 'ex_8',
            exerciseName: 'Barbell Overhead Press (OHP)',
            targetMuscle: 'Shoulders',
            equipment: 'Barbell',
            restSeconds: 90,
            coachNotes: 'Strict form. No leg drive.',
            sets: [
              { setNumber: 1, targetReps: '6-8', actualReps: 8, targetWeightKg: 50, actualWeightKg: 50, completed: false, previousSession: { weightKg: 47.5, reps: 8 } },
              { setNumber: 2, targetReps: '6-8', actualReps: 7, targetWeightKg: 50, actualWeightKg: 50, completed: false, previousSession: { weightKg: 47.5, reps: 7 } },
              { setNumber: 3, targetReps: '6-8', actualReps: 6, targetWeightKg: 50, actualWeightKg: 50, completed: false, previousSession: { weightKg: 47.5, reps: 6 } }
            ]
          },
          {
            exerciseId: 'ex_5',
            exerciseName: 'Standing Dumbbell Lateral Raise',
            targetMuscle: 'Shoulders',
            equipment: 'Dumbbell',
            restSeconds: 60,
            coachNotes: 'Superset this immediately with tricep pushdowns.',
            supersetWithId: 'ex_9',
            sets: [
              { setNumber: 1, targetReps: '12-15', actualReps: 15, targetWeightKg: 12, actualWeightKg: 12, completed: false, previousSession: { weightKg: 10, reps: 15 } },
              { setNumber: 2, targetReps: '12-15', actualReps: 13, targetWeightKg: 12, actualWeightKg: 12, completed: false, previousSession: { weightKg: 12, reps: 12 } },
              { setNumber: 3, targetReps: '12-15', actualReps: 12, targetWeightKg: 12, actualWeightKg: 12, completed: false, previousSession: { weightKg: 12, reps: 11 } }
            ]
          },
          {
            exerciseId: 'ex_9',
            exerciseName: 'Cable Triceps Rope Pushdown',
            targetMuscle: 'Arms',
            equipment: 'Cable',
            restSeconds: 60,
            coachNotes: 'Squeeze hard at full extension.',
            sets: [
              { setNumber: 1, targetReps: '10-12', actualReps: 12, targetWeightKg: 25, actualWeightKg: 25, completed: false, previousSession: { weightKg: 22.5, reps: 12 } },
              { setNumber: 2, targetReps: '10-12', actualReps: 11, targetWeightKg: 25, actualWeightKg: 25, completed: false, previousSession: { weightKg: 25, reps: 10 } }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'tpl_lower_strength',
    name: 'Lower Body Strength & Posterior Chain',
    category: 'Upper / Lower',
    description: 'Squat & RDL foundational heavy loading',
    daysPerWeek: 4,
    weeksDuration: 6,
    workouts: []
  }
];

export const INITIAL_ASSIGNED_WORKOUT: AssignedWorkout = {
  id: 'workout_today',
  clientId: 'client_alex',
  title: 'Day 1: Upper Hypertrophy & Chest/Delt Specialization',
  description: 'Block 2, Week 3. Progressive overload target: +2.5kg on Incline DB Press.',
  dayOfWeek: 'Today',
  assignedDate: new Date().toISOString().split('T')[0],
  isCompleted: false,
  exercises: [
    {
      id: 'we_1',
      exerciseId: 'ex_2',
      exerciseName: 'Incline Dumbbell Bench Press',
      targetMuscle: 'Chest',
      equipment: 'Dumbbell',
      videoUrl: '/assets/founders/videos/mass-training-1.mp4',
      restSeconds: 90,
      coachNotes: 'Pause for 1 second at the chest stretch. Focus on pec stretch before pressing.',
      clientNotes: '',
      sets: [
        { setNumber: 1, targetReps: '8-10', actualReps: 10, targetWeightKg: 34, actualWeightKg: 34, targetRpe: 8, actualRpe: 8, completed: true, previousSession: { weightKg: 32, reps: 10, rpe: 8 } },
        { setNumber: 2, targetReps: '8-10', actualReps: 9, targetWeightKg: 34, actualWeightKg: 34, targetRpe: 8.5, actualRpe: 8.5, completed: true, previousSession: { weightKg: 32, reps: 9, rpe: 8.5 } },
        { setNumber: 3, targetReps: '8-10', actualReps: 8, targetWeightKg: 34, actualWeightKg: 34, targetRpe: 9, actualRpe: 9, completed: false, previousSession: { weightKg: 32, reps: 8, rpe: 9 } }
      ]
    },
    {
      id: 'we_2',
      exerciseId: 'ex_4',
      exerciseName: 'Lat Pulldown (Neutral Grip)',
      targetMuscle: 'Back',
      equipment: 'Cable',
      videoUrl: '/assets/founders/videos/mass-training-2.mp4',
      restSeconds: 90,
      coachNotes: 'Drive elbows down to hips. 3-second eccentric stretch on each repetition.',
      clientNotes: '',
      sets: [
        { setNumber: 1, targetReps: '10-12', actualReps: 12, targetWeightKg: 65, actualWeightKg: 65, targetRpe: 8, actualRpe: 8, completed: false, previousSession: { weightKg: 60, reps: 12, rpe: 8 } },
        { setNumber: 2, targetReps: '10-12', actualReps: 11, targetWeightKg: 65, actualWeightKg: 65, targetRpe: 8.5, actualRpe: 8.5, completed: false, previousSession: { weightKg: 60, reps: 11, rpe: 8.5 } },
        { setNumber: 3, targetReps: '10-12', actualReps: 10, targetWeightKg: 65, actualWeightKg: 65, targetRpe: 9, actualRpe: 9, completed: false, previousSession: { weightKg: 60, reps: 10, rpe: 9 } }
      ]
    },
    {
      id: 'we_3',
      exerciseId: 'ex_5',
      exerciseName: 'Standing Dumbbell Lateral Raise',
      targetMuscle: 'Shoulders',
      equipment: 'Dumbbell',
      videoUrl: '/assets/founders/videos/pouya-training.mp4',
      restSeconds: 60,
      coachNotes: 'Superset: go directly to Tricep Pushdowns with no rest between pairs.',
      supersetWithId: 'we_4',
      clientNotes: '',
      sets: [
        { setNumber: 1, targetReps: '12-15', actualReps: 15, targetWeightKg: 12, actualWeightKg: 12, targetRpe: 8.5, actualRpe: 8.5, completed: false, previousSession: { weightKg: 10, reps: 15, rpe: 8 } },
        { setNumber: 2, targetReps: '12-15', actualReps: 14, targetWeightKg: 12, actualWeightKg: 12, targetRpe: 9, actualRpe: 9, completed: false, previousSession: { weightKg: 12, reps: 13, rpe: 9 } },
        { setNumber: 3, targetReps: '12-15', actualReps: 13, targetWeightKg: 12, actualWeightKg: 12, targetRpe: 9.5, actualRpe: 9.5, completed: false, previousSession: { weightKg: 12, reps: 12, rpe: 9.5 } }
      ]
    },
    {
      id: 'we_4',
      exerciseId: 'ex_9',
      exerciseName: 'Cable Triceps Rope Pushdown',
      targetMuscle: 'Arms',
      equipment: 'Cable',
      videoUrl: '/assets/founders/videos/mass-training-1.mp4',
      restSeconds: 60,
      coachNotes: 'Spread rope handles at lock out.',
      clientNotes: '',
      sets: [
        { setNumber: 1, targetReps: '10-12', actualReps: 12, targetWeightKg: 27.5, actualWeightKg: 27.5, targetRpe: 8.5, actualRpe: 8.5, completed: false, previousSession: { weightKg: 25, reps: 12, rpe: 8 } },
        { setNumber: 2, targetReps: '10-12', actualReps: 11, targetWeightKg: 27.5, actualWeightKg: 27.5, targetRpe: 9, actualRpe: 9, completed: false, previousSession: { weightKg: 25, reps: 11, rpe: 8.5 } }
      ]
    }
  ]
};

export const INITIAL_NUTRITION_PLAN: NutritionPlan = {
  clientId: 'client_alex',
  calories: 2450,
  proteinGrams: 200,
  carbsGrams: 255,
  fatGrams: 65,
  waterLiters: 3.5,
  dailyNotes: 'Maintain 4 evenly spaced protein feedings (40-50g each). Peri-workout carbs around 60g before & after training.',
  supplementGuide: [
    'Creatine Monohydrate: 5g daily (consistent timing)',
    'Whey Isolate: 1 scoop post-workout',
    'Vitamin D3: 4000 IU with breakfast',
    'Omega-3 Fish Oil: 2g EPA/DHA'
  ],
  updatedAt: '2026-03-10'
};

export const INITIAL_CHECKINS: WeeklyCheckIn[] = [
  {
    id: 'chk_1',
    clientId: 'client_alex',
    clientName: 'Alex Rivera',
    weekNumber: 3,
    submissionDate: '2026-03-08',
    weightKg: 81.2,
    adherenceRating: 9,
    energyRating: 8,
    sleepHours: 7.5,
    stressRating: 4,
    hungerRating: 5,
    waistMeasurementCm: 83.5,
    winsAndStruggles: 'Felt strong on all upper lifts! Hit the +2.5kg progression on Dumbbell Incline press. Friday night dinner was slightly higher sodium but back on track Saturday morning.',
    coachFeedback: 'Outstanding work Alex! Look at that waist measurement dropping while your pressing strength increases—that is textbook recomposition. Keep water intake locked at 3.5L and maintain the exact calorie targets for Week 4.',
    reviewedByCoach: true,
    reviewedAt: '2026-03-09'
  },
  {
    id: 'chk_2',
    clientId: 'client_jordan',
    clientName: 'Jordan Lee',
    weekNumber: 5,
    submissionDate: '2026-03-10',
    weightKg: 74.6,
    adherenceRating: 8,
    energyRating: 6,
    sleepHours: 6.5,
    stressRating: 7,
    hungerRating: 7,
    waistMeasurementCm: 79.0,
    winsAndStruggles: 'Work deadlines elevated stress this week. Missed one cardio session on Thursday, made it up Saturday.',
    reviewedByCoach: false
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    senderId: 'admin_mass_narimanian',
    senderName: 'Mass Narimanian',
    senderRole: 'coach',
    recipientId: 'client_alex',
    text: 'Hey Alex! Welcome to Block 2. We are bumping the working weight on your compound pressing this week. Let me know how your shoulder feels with the new warm-up protocol.',
    timestamp: 'Yesterday at 9:15 AM',
    read: true
  },
  {
    id: 'msg_2',
    senderId: 'client_alex',
    senderName: 'Alex Rivera',
    senderRole: 'client',
    recipientId: 'admin_mass_narimanian',
    text: 'Coach, that band dislocation and rotator cuff prep was a game changer. Zero joint impingement on the incline press today!',
    timestamp: 'Yesterday at 6:40 PM',
    read: true
  },
  {
    id: 'msg_3',
    senderId: 'admin_mass_narimanian',
    senderName: 'Mass Narimanian',
    senderRole: 'coach',
    recipientId: 'client_alex',
    text: 'Love to hear that! Keep pushing the intensity. Remember to log your RPE on the last set so I can audit your fatigue curve.',
    timestamp: 'Today at 8:05 AM',
    read: true
  }
];

export const INITIAL_CMS_CONTENT: CMSContent = {
  // Urgent Notices
  topAnnouncementBar: 'BFL FITNESS • Brothers For Life • Stronger Together • Science-rooted online fitness coaching, bespoke hypertrophy programming, and precision metabolic nutrition designed for permanent physical transformation.',
  bannerNotice: '🔥 SPRING ROSTER OPENING: 3 SPOTS REMAINING FOR ELITE 1-ON-1 COACHING',
  founderApplicationsNotice: 'Limited Coaching Roster • Applications Open',

  // Hero Section
  heroHeadline: 'ELITE PHYSIQUE TRANSFORMATION. ROOTED IN SCIENCE.',
  heroSubheadline: 'Bespoke 1-on-1 coaching, individualized programming, and precision nutrition tracking tailored to sculpt your strongest, leanest physique.',
  heroTrustPoints: [
    'Bespoke Macro Programming',
    'Weekly Video Lift Audits',
    'In-App Progressive Overload'
  ],
  heroStats: [
    { count: '500+', label: 'Transformations Completed' },
    { count: '98.4%', label: 'Goal Adherence Rate' },
    { count: '12+ Yrs', label: 'Evidence-Based Coaching' },
    { count: '100%', label: 'Personalized Plans' }
  ],

  // Founders Section
  foundersHeadline: 'Built by Athletes. Engineered for Results.',
  foundersSubheadline: 'BFL Fitness was founded on a singular standard: elite, stage-proven experience translated into scientifically calibrated biomechanical programming and metabolic precision.',
  massFounder: {
    title: 'Mass Narimanian',
    subtitle: 'Founder & Coach • Hypertrophy & Stage Conditioning Specialist',
    badge: '15+ Years Elite Experience',
    quote: 'With over 15 years of elite experience in the bodybuilding industry, Mass brings unparalleled expertise in muscle hypertrophy, stage conditioning, and elite body transformation. His hands-on experience on the stage translates to scientifically proven, results-driven programming for his clients.',
    pillars: [
      { title: 'Muscle Hypertrophy', desc: 'Biomechanically optimized stimulus-to-fatigue programming.' },
      { title: 'Stage Conditioning', desc: 'Peaking protocols, water manipulation & competition readiness.' },
      { title: 'Body Transformation', desc: 'Proven physique rebuilding for athletes and executive clients.' }
    ]
  },
  pouyaFounder: {
    title: 'Pouya Marghzari',
    subtitle: 'Founder & Coach • Boxing & Powerlifting Specialist',
    badge: '10+ Years Competitive Boxing & Powerlifting',
    quote: 'Bringing over 10 years of competitive experience in boxing and powerlifting, Pouya specializes in explosive power, raw strength mechanics, and high-performance athletic conditioning. His diverse competitive background provides clients with a unique, highly effective approach to achieving peak physical fitness.',
    pillars: [
      { title: 'Explosive Power', desc: 'Rotational force production & rapid rate of force development.' },
      { title: 'Raw Strength Mechanics', desc: 'Powerlifting barbell technique, bracing & joint-friendly loading.' },
      { title: 'Athletic Conditioning', desc: 'High-capacity energy systems for boxers, fighters & power athletes.' }
    ]
  },

  // Methodologies & Qualifications
  coachOriginStory: 'Founded by Mass Narimanian and Pouya Marghzari, BFL Fitness was created with a singular mission: eliminate the guesswork from fitness. No cookie-cutter PDF meal plans. No generic workout splits. We use clinical biomechanics, individualized metabolic tracking, and continuous data-driven adjustments to ensure you never hit a plateau.',
  coachQualifications: [
    'M.S. Exercise Physiology & Biomechanics',
    'CSCS (Certified Strength & Conditioning Specialist - NSCA)',
    'CISSN (Certified Sports Nutritionist - International Society of Sports Nutrition)',
    'Competitive Natural Bodybuilding Pro Athlete & National Judge',
    'Coached 500+ transformation athletes across 18 countries'
  ],
  trainingMethodologies: [
    {
      title: 'Evidence-Based Hypertrophy',
      description: 'We structure training around mechanical tension, optimal volume landmarks (MEV to MRV), and personalized stimulus-to-fatigue ratios to maximize muscle retention and growth.'
    },
    {
      title: 'Progressive Overload Architecture',
      description: 'Never guess what weight to touch. Our platform tracks prior session metrics, RPE, and rep ceilings to ensure continuous measurable progression week after week.'
    },
    {
      title: 'Flexible Metabolic Nutrition',
      description: 'No banned food groups. We establish individualized macro ratios, refeed cycles, and lifestyle flexibility so you can achieve sub-10% body fat without alienating social life.'
    },
    {
      title: 'Biomechanical Form Auditing',
      description: 'Submit lifting videos directly within the portal. We analyze joint angles, bar paths, and tempo to eliminate injury risk while optimizing muscular recruitment.'
    }
  ],

  // Coaching Plans Copy
  plansHeadline: 'Invest in Guaranteed Results',
  plansSubheadline: 'No cookie-cutter algorithms. Every program is individually engineered with weekly biofeedback reviews and direct messaging.',

  // Testimonials
  testimonials: [
    {
      id: 't_1',
      clientName: 'David K.',
      achievement: '-18kg Fat Loss & Abs for the First Time',
      duration: '16 Weeks',
      stats: '96kg → 78kg | Waist: 38" → 31"',
      quote: 'I spun my wheels for 4 years on random YouTube workouts. Working with BFL was night and day. The in-app tracking and Mass & Pouya\'s weekly check-in videos kept me 100% accountable.',
      beforeImg: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80',
      afterImg: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 't_2',
      clientName: 'Elena M.',
      achievement: 'Body Recomposition & First Pull-up',
      duration: '12 Weeks',
      stats: 'Body Fat: 28% → 19% | Deadlift: 60kg → 115kg',
      quote: 'I was afraid lifting heavy would make me bulky. Instead, I got sculpted, lean, and stronger than ever. The nutrition structure taught me how to fuel without guilt.',
      beforeImg: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
      afterImg: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 't_3',
      clientName: 'Sam T.',
      achievement: 'Natural Physique Contest Win',
      duration: '24 Weeks',
      stats: 'Stage Weight: 74kg at 5.5% BF | 1st Place Men\'s Physique',
      quote: 'The peak week execution was flawless. We dialed in carbohydrates and hydration with surgical precision. Best conditioning of my entire life.',
      beforeImg: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
      afterImg: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80'
    }
  ],

  // FAQs
  faqs: [
    {
      category: 'General',
      question: 'How does online coaching compare to in-person personal training?',
      answer: 'Online coaching with BFL Fitness provides exponentially more value than 1 hour a week with a gym trainer. You receive 24/7 accountability, bespoke programming, daily nutrition auditing, video lift analysis, and systematic progressive overload tracking in your pocket at a fraction of the cost.'
    },
    {
      category: 'Training',
      question: 'Do I need access to a full commercial gym?',
      answer: 'While a commercial gym provides the widest selection of hypertrophy equipment, our intake form lets you specify your exact setup—whether that is a commercial gym, garage gym, or home dumbbells/bands. Your program is built 100% around what you have.'
    },
    {
      category: 'Nutrition',
      question: 'Will I have to eat chicken, broccoli, and rice every day?',
      answer: 'Absolutely not. We believe in flexible dieting rooted in macronutrient targets and micronutrient density. We provide guidelines and meal blueprints, but you choose the foods you genuinely enjoy while hitting your targets.'
    },
    {
      category: 'Onboarding',
      question: 'How quickly do I get my program after signing up?',
      answer: 'Immediately upon checkout, your account is generated and you complete the Comprehensive Intake Form. Within 24-48 hours, our founders and head coaches audit your intake metrics, build your personalized periodized block, and schedule your onboarding call.'
    },
    {
      category: 'Commitment',
      question: 'Is there a long-term contract?',
      answer: 'Our plans operate on a monthly recurring subscription that you can adjust with 30 days notice. Real physiological transformation takes consistency, which is why we recommend at least a 12-week commitment for lasting results.'
    }
  ],

  // Contact & Footer Details
  contactEmail: 'coaching@bflfitness.com',
  supportPhone: '+1 (800) 555-BFL-FIT',
  supportHours: 'Mon – Sat, 7:00 AM – 7:00 PM CST (within 4-12 hrs)',
  locationAddress: 'Austin, TX (Remote athletes worldwide)',
  instagramHandle: '@bfl_fitness',
  youtubeChannel: 'BFL Masterclass',
  certificationTitle: 'NSCA & CISSN Certified',
  certificationDescription: 'Compliant with ACSM health screening standards.',
  footerDescription: 'Science-rooted online fitness coaching, bespoke hypertrophy programming, and precision metabolic nutrition designed for permanent physical transformation.'
};

export const INITIAL_COACHES: CoachMember[] = [
  {
    id: 'admin_mass_narimanian',
    name: 'Mass Narimanian',
    email: 'mass@bflfitness.com',
    role: 'admin',
    isAdmin: true,
    avatarUrl: '/assets/founders/mass-gym.jpg',
    specialty: 'Co-Founder • Executive Physique & Hypertrophy Engineering',
    activeClientsCount: 0,
    maxClients: 25,
    status: 'active',
    joinedDate: 'Jan 2024',
    bio: 'Co-Founder & Administrator. Specializing in advanced hypertrophy mechanics, metabolic rate reconstruction, and high-performance physique transformations.'
  },
  {
    id: 'admin_pouya_marghzari',
    name: 'Pouya Marghzari',
    email: 'pouya@bflfitness.com',
    role: 'admin',
    isAdmin: true,
    avatarUrl: '/assets/founders/pouya-boxing.jpg',
    specialty: 'Co-Founder • Biomechanics & Strength Periodization',
    activeClientsCount: 0,
    maxClients: 25,
    status: 'active',
    joinedDate: 'Jan 2024',
    bio: 'Co-Founder & Administrator. Master of neuromuscular movement efficiency, injury rehabilitation, and systematic progressive overload modeling.'
  }
];

export const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif_1',
    userId: 'client_alex',
    recipientRole: 'client',
    title: 'Coach Feedback Ready',
    message: 'Mass Narimanian reviewed your Week 3 check-in: "Outstanding work Alex! Textbook recomposition..."',
    type: 'checkin_feedback',
    timestamp: '2 hours ago',
    read: false,
    actionTab: 'checkin'
  },
  {
    id: 'notif_2',
    userId: 'client_alex',
    recipientRole: 'client',
    title: 'Training Split Updated',
    message: 'Block 2, Week 3 assigned: Incline DB Bench overload (+2.5kg target).',
    type: 'workout_assigned',
    timestamp: 'Yesterday',
    read: false,
    actionTab: 'workout'
  },
  {
    id: 'notif_3',
    userId: 'client_alex',
    recipientRole: 'client',
    title: 'Daily Hydration Target',
    message: 'Hydration goal locked at 3.5 Liters. Keep recovery optimal for tomorrow.',
    type: 'nutrition_updated',
    timestamp: '2 days ago',
    read: true,
    actionTab: 'nutrition'
  },
  {
    id: 'notif_4',
    recipientRole: 'coach',
    title: 'New Check-In Received',
    message: 'Alex Rivera submitted Week 3 biofeedback (Adherence: 9/10, Weight: 81.2kg).',
    type: 'checkin_feedback',
    timestamp: '1 day ago',
    read: false,
    actionTab: 'clients'
  }
];

export const INITIAL_PROGRESS_METRICS: ProgressMetricPoint[] = [
  {
    id: 'pm_1',
    clientId: 'client_alex',
    date: '2026-02-15',
    weightKg: 84.5,
    waistCm: 86.0,
    chestCm: 104.0,
    bicepsCm: 38.0,
    volumeLoadKg: 8200,
    notes: 'Initial baseline intake measurements.'
  },
  {
    id: 'pm_2',
    clientId: 'client_alex',
    date: '2026-02-22',
    weightKg: 83.4,
    waistCm: 85.2,
    chestCm: 104.2,
    bicepsCm: 38.2,
    volumeLoadKg: 8850,
    notes: 'End of Week 1. Glycogen adapted, lower water retention.'
  },
  {
    id: 'pm_3',
    clientId: 'client_alex',
    date: '2026-03-01',
    weightKg: 82.3,
    waistCm: 84.4,
    chestCm: 104.5,
    bicepsCm: 38.5,
    volumeLoadKg: 9400,
    notes: 'Week 2 check-in. Incline DB press weights climbed to 32kg.'
  },
  {
    id: 'pm_4',
    clientId: 'client_alex',
    date: '2026-03-08',
    weightKg: 81.2,
    waistCm: 83.5,
    chestCm: 105.0,
    bicepsCm: 38.8,
    volumeLoadKg: 10150,
    notes: 'Week 3 check-in. Waist dropped 2.5cm total; chest/biceps up in circumference!'
  }
];

export const INITIAL_PROGRESS_PHOTOS: ProgressPhotoRecord[] = [
  {
    id: 'photo_1',
    clientId: 'client_alex',
    date: '2026-02-15',
    frontUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80',
    sideUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
    weightKg: 84.5,
    notes: 'Day 1 Baseline photo before starting 1-on-1 Elite Coaching program.'
  },
  {
    id: 'photo_2',
    clientId: 'client_alex',
    date: '2026-03-08',
    frontUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80',
    sideUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80',
    weightKg: 81.2,
    notes: 'Week 3 Progress check: noticeable midsection tightening and upper chest density.'
  }
];
