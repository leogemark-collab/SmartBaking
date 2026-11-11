import { Head } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCheck,
    Clock3,
    Download,
    LogIn,
    LogOut,
    Search,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    EmptyState,
    PageHeading,
    Panel,
    StatCard,
    StatusBadge,
} from '@/components/workspace/ui';
import { useWorkspace } from '@/components/workspace/workspace-provider';
import { downloadCsv, sampleDay } from '@/lib/workspace';

type AttendanceStatus =
    | 'On shift'
    | 'On break'
    | 'Not started'
    | 'Shift complete';
type TeamMember = {
    id: string;
    name: string;
    role: string;
    shift: string;
    checkIn: string | null;
    checkOut: string | null;
    status: AttendanceStatus;
};

const sampleTeam: TeamMember[] = [
    {
        id: 'DEMO-01',
        name: 'Alex R.',
        role: 'Head baker',
        shift: '06:00–14:00',
        checkIn: '05:55',
        checkOut: null,
        status: 'On shift',
    },
    {
        id: 'DEMO-02',
        name: 'Jamie C.',
        role: 'Baker',
        shift: '06:00–14:00',
        checkIn: '06:00',
        checkOut: null,
        status: 'On shift',
    },
    {
        id: 'DEMO-03',
        name: 'Sam D.',
        role: 'Cashier',
        shift: '07:00–15:00',
        checkIn: '06:58',
        checkOut: null,
        status: 'On break',
    },
    {
        id: 'DEMO-04',
        name: 'Casey M.',
        role: 'Production assistant',
        shift: '09:00–17:00',
        checkIn: null,
        checkOut: null,
        status: 'Not started',
    },
    {
        id: 'DEMO-05',
        name: 'Taylor P.',
        role: 'Cashier',
        shift: '09:00–17:00',
        checkIn: null,
        checkOut: null,
        status: 'Not started',
    },
    {
        id: 'DEMO-06',
        name: 'Robin L.',
        role: 'Production assistant',
        shift: '04:00–08:00',
        checkIn: '04:00',
        checkOut: '08:00',
        status: 'Shift complete',
    },
];
const roles = ['Head baker', 'Baker', 'Cashier', 'Production assistant'];
const statusTone = {
    'On shift': 'green',
    'On break': 'amber',
    'Not started': 'neutral',
    'Shift complete': 'terra',
} as const;
const avatarColors = [
    'bg-[#eee7da] text-[#a58d67]',
    'bg-[#e9eee3] text-[#7e916d]',
    'bg-[#f6e7de] text-[#b68064]',
    'bg-[#e8eced] text-[#839597]',
];

export default function Team() {
    const { branch } = useWorkspace();

    return <TeamContent key={branch} branch={branch} />;
}

function TeamContent({ branch }: { branch: string }) {
    const [members, setMembers] = useState(() =>
        sampleTeam.map((member) => ({ ...member })),
    );
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('All roles');
    const [status, setStatus] = useState('All statuses');
    const filtered = members.filter(
        (member) =>
            (role === 'All roles' || member.role === role) &&
            (status === 'All statuses' || member.status === status) &&
            `${member.name} ${member.id} ${member.role}`
                .toLowerCase()
                .includes(search.toLowerCase().trim()),
    );
    const clockedIn = members.filter(
        (member) =>
            member.status === 'On shift' || member.status === 'On break',
    ).length;

    function recordAttendance(id: string, action: 'in' | 'out') {
        setMembers((current) =>
            current.map((member) => {
                if (member.id !== id) return member;
                if (action === 'in' && member.status === 'Not started')
                    return { ...member, checkIn: '09:00', status: 'On shift' };
                if (
                    action === 'out' &&
                    (member.status === 'On shift' ||
                        member.status === 'On break')
                )
                    return {
                        ...member,
                        checkOut: '09:00',
                        status: 'Shift complete',
                    };
                return member;
            }),
        );
        toast.success(
            `Demo check-${action} recorded at 09:00 PHT. No employee record was saved.`,
        );
    }

    function exportAttendance() {
        downloadCsv('smartbaking-demo-attendance.csv', [
            [
                'Sample date',
                'Branch',
                'Demo staff',
                'Role',
                'Shift (PHT)',
                'Check in (PHT)',
                'Check out (PHT)',
                'Status',
            ],
            ...filtered.map((member) => [
                sampleDay,
                branch,
                member.name,
                member.role,
                member.shift,
                member.checkIn ?? '',
                member.checkOut ?? '',
                member.status,
            ]),
        ]);
    }

    return (
        <>
            <Head title="Team & attendance" />
            <PageHeading
                eyebrow="GOOD DAYS START WITH A GOOD TEAM"
                title="Team & attendance"
                description="A simple view of who's on the floor, who's on break, and who's up next."
                actions={
                    <Button
                        variant="outline"
                        className="h-10 rounded-lg border-[#e4ded4]"
                        onClick={exportAttendance}
                    >
                        <Download />
                        Export demo
                    </Button>
                }
            />
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Scheduled team"
                    value={members.length}
                    hint={`${branch} · synthetic roster`}
                    icon={Users}
                />
                <StatCard
                    label="Clocked in"
                    value={clockedIn}
                    hint="Includes team members on break"
                    icon={LogIn}
                    tone="green"
                />
                <StatCard
                    label="Check-in pending"
                    value={
                        members.filter(
                            (member) => member.status === 'Not started',
                        ).length
                    }
                    hint="Upcoming sample shifts"
                    icon={Clock3}
                    tone="terra"
                />
                <StatCard
                    label="Shifts completed"
                    value={
                        members.filter(
                            (member) => member.status === 'Shift complete',
                        ).length
                    }
                    hint={`${sampleDay} · sample day`}
                    icon={CheckCheck}
                />
            </div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e9dfc9] bg-[#fcf7eb] px-4 py-3 text-xs leading-6 text-[#8b7149]">
                <p>
                    <strong>Demo attendance.</strong> Names and shifts are
                    fictional. Actions reset when you change branch or leave
                    this screen.
                </p>
                <span className="inline-flex shrink-0 items-center gap-2 font-semibold">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    Sample clock: 09:00 PHT
                </span>
            </div>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
                <Panel
                    title="Today's team"
                    description={`${sampleDay} · all times Philippine time (PHT)`}
                    action={
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9a8c7b]">
                            <CalendarDays
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            Sample day
                        </span>
                    }
                >
                    <div className="flex flex-wrap gap-3 border-b border-[#f0ece6] px-5 pb-5 sm:px-6">
                        <div className="relative min-w-44 flex-1">
                            <Search
                                className="absolute top-3 left-3 size-4 text-[#9c9080]"
                                aria-hidden="true"
                            />
                            <Input
                                aria-label="Search team"
                                className="h-10 rounded-lg border-[#e4ded4] pl-9"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search team members…"
                            />
                        </div>
                        <select
                            aria-label="Filter team role"
                            className="h-10 rounded-lg border border-[#e4ded4] bg-white px-3 text-xs"
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                        >
                            {['All roles', ...roles].map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter attendance status"
                            className="h-10 rounded-lg border border-[#e4ded4] bg-white px-3 text-xs"
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            {[
                                'All statuses',
                                'On shift',
                                'On break',
                                'Not started',
                                'Shift complete',
                            ].map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    {filtered.length === 0 ? (
                        <EmptyState
                            title="No team members match"
                            description="Adjust your search, role, or attendance filter."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[710px] text-left text-xs">
                                <thead className="bg-[#fbfaf7] text-[10px] font-medium tracking-wider text-[#9a8d7d] uppercase">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">
                                            Team member
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Shift · PHT
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            In / out
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-5 py-3 text-right font-medium">
                                            Demo action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0ece6]">
                                    {filtered.map((member, index) => (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-[#fdfbf8]"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColors[index % avatarColors.length]}`}
                                                        aria-hidden="true"
                                                    >
                                                        {member.name
                                                            .split(' ')
                                                            .map(
                                                                (part) =>
                                                                    part[0],
                                                            )
                                                            .join('')}
                                                    </span>
                                                    <div>
                                                        <p className="font-semibold text-[#504338]">
                                                            {member.name}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-[#a09382]">
                                                            {member.role} ·{' '}
                                                            {member.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-[#817568] tabular-nums">
                                                {member.shift}
                                            </td>
                                            <td className="px-4 py-4 text-[#817568] tabular-nums">
                                                <p>
                                                    {member.checkIn ?? '—'}{' '}
                                                    <span className="text-[10px] text-[#b1a495]">
                                                        in
                                                    </span>
                                                </p>
                                                <p className="mt-1">
                                                    {member.checkOut ?? '—'}{' '}
                                                    <span className="text-[10px] text-[#b1a495]">
                                                        out
                                                    </span>
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge
                                                    tone={
                                                        statusTone[
                                                            member.status
                                                        ]
                                                    }
                                                >
                                                    {member.status}
                                                </StatusBadge>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {member.status ===
                                                'Not started' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-[#dce4d4] text-[11px] text-[#647858]"
                                                        onClick={() =>
                                                            recordAttendance(
                                                                member.id,
                                                                'in',
                                                            )
                                                        }
                                                    >
                                                        <LogIn className="size-3.5" />
                                                        Check in
                                                    </Button>
                                                ) : member.status ===
                                                  'Shift complete' ? (
                                                    <span className="text-[11px] text-[#a39685]">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-[#e8dbcb] text-[11px] text-[#956d55]"
                                                        onClick={() =>
                                                            recordAttendance(
                                                                member.id,
                                                                'out',
                                                            )
                                                        }
                                                    >
                                                        <LogOut className="size-3.5" />
                                                        Check out
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
                <div className="space-y-5">
                    <Panel
                        title="Roles on the roster"
                        description="A fictional team for this branch."
                    >
                        <div className="space-y-4 px-6 pb-6">
                            {roles.map((roleName) => (
                                <div
                                    key={roleName}
                                    className="flex items-center justify-between gap-3 text-xs"
                                >
                                    <span className="text-[#8c7e6c]">
                                        {roleName}
                                    </span>
                                    <span className="flex size-6 items-center justify-center rounded-md bg-[#f5f2ec] font-semibold text-[#947e60]">
                                        {
                                            members.filter(
                                                (member) =>
                                                    member.role === roleName,
                                            ).length
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                    <div className="rounded-2xl border border-[#e0e6d9] bg-[#f1f5eb] p-5">
                        <span className="mb-3 flex size-9 items-center justify-center rounded-xl bg-white/80 text-[#7d9368]">
                            <Users className="size-4" aria-hidden="true" />
                        </span>
                        <h2 className="text-sm font-semibold text-[#60744e]">
                            People, before paperwork.
                        </h2>
                        <p className="mt-2 text-xs leading-6 text-[#82916f]">
                            Try check-in and check-out to explore the workflow.
                            This preview keeps no employee records and does not
                            calculate payroll, overtime, or wages.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
