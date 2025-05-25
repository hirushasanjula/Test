'use client';
import { useState, useEffect } from 'react';

const DashboardStats = ({ userRole, userId, companyId }) => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayShifts: 0,
    activeTimeEntries: 0,
    thisWeekHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userRole, userId, companyId]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch total employees (managers only)
      let totalEmployees = 0;
      if (userRole === 'MANAGER') {
        const usersRes = await fetch('/api/users', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!usersRes.ok) throw new Error('Failed to fetch users');
        const users = await usersRes.json();
        totalEmployees = users.length;
      }

      // Fetch today's shifts
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      const shiftsQuery = userRole === 'EMPLOYEE' ? `/api/shifts?userId=${userId}` : '/api/shifts';
      const shiftsRes = await fetch(shiftsQuery, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!shiftsRes.ok) throw new Error('Failed to fetch shifts');
      const shifts = await shiftsRes.json();
      const todayShifts = shifts.filter(
        (shift) =>
          new Date(shift.startTime) >= new Date(startOfDay) &&
          new Date(shift.startTime) <= new Date(endOfDay)
      ).length;

      // Fetch time entries
      const timeEntriesQuery = userRole === 'EMPLOYEE' ? `/api/time-entries?userId=${userId}` : '/api/time-entries';
      const timeEntriesRes = await fetch(timeEntriesQuery, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!timeEntriesRes.ok) throw new Error('Failed to fetch time entries');
      const timeEntries = await timeEntriesRes.json();

      // Calculate active time entries
      const activeTimeEntries = timeEntries.filter((entry) => entry.status === 'ACTIVE').length;

      // Calculate this week's hours
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const thisWeekHours = timeEntries
        .filter(
          (entry) =>
            entry.clockOut &&
            new Date(entry.clockIn) >= startOfWeek &&
            new Date(entry.clockOut) <= endOfWeek
        )
        .reduce((total, entry) => {
          const duration = (new Date(entry.clockOut) - new Date(entry.clockIn)) / (1000 * 60 * 60); // Hours
          return total + duration;
        }, 0)
        .toFixed(1);

      setStats({
        totalEmployees,
        todayShifts,
        activeTimeEntries,
        thisWeekHours,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards =
    userRole === 'MANAGER'
      ? [
          { title: 'Total Employees', value: stats.totalEmployees, color: 'blue' },
          { title: "Today's Shifts", value: stats.todayShifts, color: 'green' },
          { title: 'Active Time Entries', value: stats.activeTimeEntries, color: 'yellow' },
          { title: 'This Week Hours', value: `${stats.thisWeekHours}h`, color: 'purple' },
        ]
      : [
          { title: 'My Shifts This Week', value: stats.todayShifts, color: 'blue' },
          { title: 'Hours Worked', value: `${stats.thisWeekHours}h`, color: 'green' },
          { title: 'Active Sessions', value: stats.activeTimeEntries, color: 'yellow' },
          { title: 'Days Worked', value: stats.thisWeekHours > 0 ? Math.min(5, Math.ceil(stats.thisWeekHours / 8)) : 0, color: 'purple' },
        ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
              <div className={`w-6 h-6 bg-${stat.color}-500 rounded`}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;