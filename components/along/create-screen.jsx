'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAlong } from './context';
import { ActionButton, BackButton, PageHeading, Panel } from './shared';

function SelectField({ id, label, value, onChange, options }) {
  return <div className="field"><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="along-select"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, text]) => <SelectItem key={optionValue} value={optionValue}>{text}</SelectItem>)}</SelectContent></Select></div>;
}

export function CreateScreen() {
  const { publishPlan } = useAlong();
  const [category, setCategory] = useState('Fitness');
  const [size, setSize] = useState('2');

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = new Date(`${form.get('date')}T${form.get('time')}`);
    if (Number.isNaN(date.getTime())) return toast.error('Choose a valid date and time.');
    if (date <= new Date()) return toast.error('Choose a future date for your plan.');
    const groupSize = Number(size);
    publishPlan({
      id: Date.now(), category, size: groupSize, spots: groupSize - 1, status: 'open', host: 'You', initials: 'YO', tone: '',
      title: String(form.get('title')).trim(), venue: String(form.get('venue')).trim(), intro: String(form.get('intro')).trim(),
      date: date.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('en-UG', { hour: 'numeric', minute: '2-digit' }),
      meet: String(form.get('meet')).trim(), bring: String(form.get('bring')).trim() || 'Whatever you need for the activity'
    });
  }

  return <><BackButton /><PageHeading title="Make a plan" description="Give people a clear reason to say “I’m in.”" /><div className="form-layout">
    <Panel><form className="create-form" onSubmit={submit}>
      <div className="field"><Label htmlFor="activity">What do you want to do?</Label><Input id="activity" name="title" required maxLength={80} placeholder="e.g. Try the Saturday beginner swim class" /><small>Make it specific enough to picture the outing.</small></div>
      <div className="two-fields"><SelectField id="category" label="Category" value={category} onChange={setCategory} options={['Fitness', 'Outings', 'Learning'].map((value) => [value, value])} /><SelectField id="size" label="Group size" value={size} onChange={setSize} options={[["2", 'Me + 1 person'], ["3", '3 people'], ["4", '4 people'], ["5", '5 people']]} /></div>
      <div className="field"><Label htmlFor="venue">Public venue</Label><Input id="venue" name="venue" required maxLength={90} placeholder="Venue name and neighbourhood" /></div>
      <div className="two-fields"><div className="field"><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required /></div><div className="field"><Label htmlFor="time">Time</Label><Input id="time" name="time" type="time" required /></div></div>
      <div className="field"><Label htmlFor="intro">What should people know?</Label><Textarea id="intro" name="intro" required maxLength={320} placeholder="The pace, vibe, and why you'd like company" /></div>
      <div className="two-fields"><div className="field"><Label htmlFor="meet">Where exactly will you meet?</Label><Input id="meet" name="meet" required placeholder="e.g. At the front entrance" /></div><div className="field"><Label htmlFor="bring">What should they bring?</Label><Input id="bring" name="bring" placeholder="e.g. Comfortable shoes" /></div></div>
      <ActionButton type="submit" tone="orange">Publish plan <ArrowRight aria-hidden="true" /></ActionButton>
    </form></Panel>
    <Panel className="form-intro"><h2>A good plan feels easy to join.</h2><p>Specific details help someone decide, show up, and find you when they arrive.</p><ol><li>Choose a public venue with a clear meeting point.</li><li>Say whether it’s beginner friendly and mention likely costs.</li><li>Keep the group small enough to coordinate easily.</li></ol></Panel>
  </div></>;
}
