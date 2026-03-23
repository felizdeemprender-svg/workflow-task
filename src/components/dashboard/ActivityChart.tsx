"use client";

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Lun', spirit: 320, tasks: 2 },
  { name: 'Mar', spirit: 450, tasks: 5 },
  { name: 'Mie', spirit: 410, tasks: 3 },
  { name: 'Jue', spirit: 600, tasks: 8 },
  { name: 'Vie', spirit: 550, tasks: 6 },
  { name: 'Sab', spirit: 720, tasks: 9 },
  { name: 'Dom', spirit: 800, tasks: 12 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ 
        padding: '0.75rem 1rem', 
        borderRadius: '12px', 
        fontSize: '0.8rem',
        border: '1px solid var(--border-light)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-premium)'
      }}>
        <p className="font-bold" style={{ color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>{label}</p>
        <div className="flex-col gap-1">
          <div className="flex-row gap-2 items-center">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Spirit: {payload[0].value} pts</span>
          </div>
          <div className="flex-row gap-2 items-center">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span style={{ color: '#10b981', fontWeight: 600 }}>Tareas: {payload[1].value}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ActivityChart() {
  return (
    <div className="glass-panel fade-in" style={{ 
      padding: '1.5rem', 
      borderRadius: '24px',
      background: 'var(--card-bg)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--border-light)',
      height: '350px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="flex-row justify-between items-center">
        <div className="flex-col">
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Rendimiento Semanal</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progresión de Spirit Score y tareas completadas</p>
        </div>
        <div className="flex-row gap-4" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
          <div className="flex-row gap-1.5 items-center">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
            <span>SPIRIT</span>
          </div>
          <div className="flex-row gap-1.5 items-center">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>TAREAS</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorSpirit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              hide 
              domain={[0, 'dataMax + 100']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="spirit" 
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSpirit)" 
              animationDuration={1500}
            />
            <Area 
              type="monotone" 
              dataKey="tasks" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorTasks)" 
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
