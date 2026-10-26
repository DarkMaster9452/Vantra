'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, BarChart3, Bookmark, CheckCheck, Clapperboard, FolderHeart, LockKeyhole, MessageSquareText, Play, RefreshCw, Sparkles, Star, Tv } from 'lucide-react'
import { parsePersonalStats, statsAxisMaximum, statsKinds, statsMonthLabel, statsPercentage, statsTitleHref, type PersonalStats as StatsData, type StatsKind, type StatsMetric, type StatsScope } from '@/lib/personal-stats'
import { posterImage } from '@/lib/media-presentation'
import { useAccount } from './AccountProvider'
import Shell, { ErrorPanel } from './Shell'
import Avatar from './Avatar'
import s from './personal-stats.module.css'

const formats = [{ key: 'movie', label: 'Movies', color: '#ed2638' }, { key: 'tv', label: 'Series', color: '#f1b5c0' }, { key: 'anime', label: 'Anime', color: '#767683' }] as const
const statuses = [{ key: 'planned', label: 'Plan to watch', color: '#777783' }, { key: 'watching', label: 'Watching', color: '#ed2638' }, { key: 'completed', label: 'Completed', color: '#f1b5c0' }, { key: 'paused', label: 'On hold', color: '#50505d' }, { key: 'dropped', label: 'Dropped', color: '#34343f' }] as const
const metrics = { saved: 'Saved titles', completed: 'Finished titles', episodes: 'Episodes marked' } as const
const number = (value: number) => value.toLocaleString('en-GB')

function Count({ value, decimal = false }: { value: number; decimal?: boolean }) {
  const reduce = useReducedMotion()
  const progress = useMotionValue(0)
  const text = useTransform(progress, current => decimal ? current.toFixed(1) : number(Math.round(current)))
  useEffect(() => {
    if (reduce) { progress.set(value); return }
    const animation = animate(progress, value, { duration: .7, ease: [.22, 1, .36, 1] })
    return () => animation.stop()
  }, [value, reduce, progress])
  return <><span className={s.srOnly}>{decimal ? value.toFixed(1) : number(value)}</span><motion.span aria-hidden="true">{text}</motion.span></>
}

function Activity({ scope }: { scope: StatsScope }) {
  const [metric, setMetric] = useState<StatsMetric>('saved')
  const [range, setRange] = useState<6 | 12>(6)
  const [selected, setSelected] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const months = scope.months.slice(-range)
  const active = months.find(month => month.month === selected) || months[months.length - 1]
  const total = months.reduce((sum, month) => sum + month[metric], 0)
  const max = statsAxisMaximum(months.map(month => month[metric]))
  return <section className={`${s.panel} ${s.activity}`} aria-labelledby="activity-heading">
    <div className={s.panelHead}><div><p className={s.kicker}>ONE CHAPTER AT A TIME</p><h2 id="activity-heading">Your story so far<span>.</span></h2></div><div className={s.range} aria-label="Activity period">{([6, 12] as const).map(value => <button type="button" key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value}m</button>)}</div></div>
    <div className={s.activitySummary}><strong><Count value={total} /></strong><span>{metrics[metric].toLowerCase()}<br /><small>in the last {range} months</small></span></div>
    <div className={s.metricTabs} aria-label="Activity measure">{(Object.keys(metrics) as StatsMetric[]).map(key => <button type="button" key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}><i />{metrics[key]}</button>)}</div>
    <div className={s.chartScroll}><div className={`${s.chart} ${range === 12 ? s.twelve : ''}`}>
      <div className={s.gridLines} aria-hidden="true">{[max, max / 2, 0].map(value => <span key={value}><b>{number(value)}</b></span>)}</div>
      <div className={s.bars}>{months.map(month => <button key={month.month} type="button" className={s.bar} aria-pressed={active.month === month.month} aria-label={`${statsMonthLabel(month.month, true)}: ${month[metric]} ${metrics[metric].toLowerCase()}`} onFocus={() => setSelected(month.month)} onPointerEnter={() => setSelected(month.month)} onClick={() => setSelected(month.month)}>
        <span className={s.barTrack}><motion.i initial={false} animate={{ height: `${statsPercentage(month[metric], max)}%` }} transition={{ duration: reduce ? 0 : .55, ease: [.22, 1, .36, 1] }} /><span className={s.barValue}>{number(month[metric])}</span></span><span className={s.month}>{statsMonthLabel(month.month)}</span>
      </button>)}</div>
    </div></div>
    <div className={s.chartCaption} role="status"><span><i />{statsMonthLabel(active.month, true)}</span><strong>{number(active[metric])} {metrics[metric].toLowerCase()}</strong></div>
  </section>
}

function MediaMix({ scope }: { scope: StatsScope }) {
  const reduce = useReducedMotion()
  return <section className={`${s.panel} ${s.mix}`} aria-labelledby="mix-heading"><div className={s.panelHead}><div><p className={s.kicker}>A LITTLE OF EVERYTHING</p><h2 id="mix-heading">Your kind of story<span>.</span></h2></div><Clapperboard size={20} /></div>
    <div className={s.donut}><svg viewBox="0 0 220 220" role="img" aria-label={`Library: ${scope.media.movie} movies, ${scope.media.tv} series and ${scope.media.anime} anime.`}><circle cx="110" cy="110" r="86" fill="none" stroke="#ffffff08" strokeWidth="16" />{formats.map((format, index) => {
      const percentage = statsPercentage(scope.media[format.key], scope.total)
      const start = statsPercentage(formats.slice(0, index).reduce((sum, item) => sum + scope.media[item.key], 0), scope.total)
      return <motion.circle key={format.key} cx="110" cy="110" r="86" fill="none" stroke={format.color} strokeWidth="16" pathLength="100" transform="rotate(-90 110 110)" initial={false} animate={{ strokeDasharray: `${percentage} ${100 - percentage}`, strokeDashoffset: -start }} transition={{ duration: reduce ? 0 : .7 }} opacity={percentage ? 1 : 0} />
    })}</svg><div className={s.donutCenter}><strong><Count value={scope.total} /></strong><span>saved {scope.total === 1 ? 'story' : 'stories'}</span></div></div>
    <div className={s.legend}>{formats.map(format => <div key={format.key}><span><i style={{ background: format.color }} />{format.label}</span><strong>{number(scope.media[format.key])}<small>{Math.round(statsPercentage(scope.media[format.key], scope.total))}%</small></strong></div>)}</div>
  </section>
}

function WatchProgress({ scope }: { scope: StatsScope }) {
  const reduce = useReducedMotion()
  return <section className={s.panel} aria-labelledby="progress-heading"><div className={s.panelHead}><div><p className={s.kicker}>AT YOUR OWN PACE</p><h2 id="progress-heading">Where you left off<span>.</span></h2></div><span className={s.completion}>{Math.round(statsPercentage(scope.statuses.completed, scope.total))}%<small>completed</small></span></div>
    <div className={s.statusStack} aria-hidden="true">{statuses.map(status => <motion.i key={status.key} style={{ background: status.color }} initial={false} animate={{ width: `${statsPercentage(scope.statuses[status.key], scope.total)}%` }} transition={{ duration: reduce ? 0 : .55 }} />)}</div>
    <dl className={s.statusList}>{statuses.map(status => <div key={status.key}><dt><i style={{ background: status.color }} />{status.label}</dt><dd>{number(scope.statuses[status.key])}<span>{Math.round(statsPercentage(scope.statuses[status.key], scope.total))}%</span></dd></div>)}</dl>
    <Link className={s.textLink} href="/library">Pick up your library <ArrowUpRight size={14} /></Link>
  </section>
}

function Ratings({ scope }: { scope: StatsScope }) {
  const reduce = useReducedMotion()
  const peak = Math.max(1, ...scope.ratings.map(entry => entry.count))
  return <section className={s.panel} aria-labelledby="ratings-heading"><div className={s.panelHead}><div><p className={s.kicker}>YOUR TAKE, YOUR TASTE</p><h2 id="ratings-heading">The scores you give<span>.</span></h2></div><Star size={20} /></div>
    <div className={s.ratingSummary}><strong>{scope.average_rating === null ? '—' : <Count value={scope.average_rating} decimal />}</strong><span>/ 10<small>your average rating</small></span><b>{number(scope.rated)} {scope.rated === 1 ? 'title' : 'titles'} rated</b></div>
    <div className={s.ratingBars} role="img" aria-label={scope.rated ? scope.ratings.map(entry => `${entry.rating} out of 10: ${entry.count} titles`).join('; ') : 'No personal ratings yet.'}>{scope.ratings.map(entry => <div key={entry.rating} title={`${entry.rating}/10 · ${entry.count} titles`}><span>{entry.count > 0 ? entry.count : ''}</span><div><motion.i initial={false} animate={{ height: `${entry.count / peak * 100}%` }} transition={{ duration: reduce ? 0 : .55 }} /></div><b>{entry.rating}</b></div>)}</div>
    <p className={s.hint}>{scope.rated ? 'Only your private scores. Official ratings stay separate.' : 'Rate a saved title in My Library to start your taste profile.'}</p>
  </section>
}

function Dashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [kind, setKind] = useState<StatsKind>('all')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(null)
      try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        const response = await fetch(`/api/account/stats?timezone=${encodeURIComponent(zone)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]), cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Your statistics could not be loaded.')
        if (!controller.signal.aborted) setStats(parsePersonalStats(result))
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error && failure.name !== 'TimeoutError' ? failure.message : 'Your statistics took too long. Please try again.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [userId, revision])
  const scope = stats?.scopes[kind]
  return <>
    <div className={s.toolbar}><div className={s.kindTabs} aria-label="Statistics media type">{(Object.keys(statsKinds) as StatsKind[]).map(key => <button type="button" key={key} aria-pressed={kind === key} onClick={() => setKind(key)}>{kind === key && <motion.i layoutId="stats-kind" transition={{ duration: reduce ? 0 : .22 }} />}{statsKinds[key]}</button>)}</div><button className={s.refresh} type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} aria-label="Refresh statistics"><RefreshCw size={14} className={loading ? s.spinning : undefined} /><span>{loading ? 'Updating…' : 'Refresh'}</span></button></div>
    {error && <ErrorPanel title="A pause in the story." message={error} retry={() => setRevision(value => value + 1)} />}
    {!scope || !stats ? !error && <StatsSkeleton /> : <motion.div initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: loading ? .55 : 1, y: 0 }} transition={{ duration: reduce ? 0 : .3 }} aria-busy={loading} className={s.dashboard}>
      <div className={s.kpis}>
        {[{ label: 'Saved stories', value: scope.total, detail: 'A world waiting for you', icon: Bookmark }, { label: 'In progress', value: scope.statuses.watching, detail: 'Your current chapters', icon: Play }, { label: 'Finished stories', value: scope.statuses.completed, detail: 'The ones you saw through', icon: CheckCheck }, { label: 'Your average', value: scope.average_rating, detail: `${number(scope.rated)} private ${scope.rated === 1 ? 'rating' : 'ratings'}`, icon: Star }].map((item, index) => <motion.section key={item.label} className={s.kpi} initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : index * .055 }}><div><span>{item.label}</span><item.icon size={18} /></div><strong>{item.value === null ? '—' : <Count value={item.value} decimal={index === 3} />}{index === 3 && <small>/10</small>}</strong><p>{item.detail}</p><span className={s.kpiRule} /></motion.section>)}
      </div>
      {scope.total === 0 && <div className={s.emptyScope}><Sparkles size={20} /><div><strong>{kind === 'all' ? 'Your story starts here.' : `No ${statsKinds[kind].toLowerCase()} saved yet.`}</strong><p>Save a title to your library. Your statistics will grow with it.</p></div><Link href={kind === 'anime' ? '/anime' : `/browse${kind === 'all' ? '' : `?type=${kind}`}`}>Find a story <ArrowUpRight size={15} /></Link></div>}
      <div className={s.mainGrid}><Activity scope={scope} /><MediaMix scope={scope} /></div>
      <div className={s.detailsGrid}><WatchProgress scope={scope} /><Ratings scope={scope} /></div>
      <div className={s.littleThings}>
        <div><Tv size={20} /><strong><Count value={scope.episodes} /></strong><span>episodes marked watched</span></div>
        <div><MessageSquareText size={20} /><strong><Count value={scope.notes} /></strong><span>personal notes</span></div>
        <div><FolderHeart size={20} /><strong><Count value={stats.collections} /></strong><span>collections · all stories</span></div>
      </div>
      <section className={s.topSection} aria-labelledby="top-heading"><div className={s.topHeading}><div><p className={s.kicker}>THE ONES THAT STAY WITH YOU</p><h2 id="top-heading">Your highest rated<span>.</span></h2></div><Link className={s.textLink} href="/library">My library <ArrowUpRight size={14} /></Link></div>
        {scope.top.length ? <div className={s.topGrid}>{scope.top.map((title, index) => {
          const poster = posterImage(title.poster)
          return <Link href={statsTitleHref(title)} key={`${title.kind}:${title.id}`} className={s.topCard}><div className={s.poster}>{poster ? <Image src={poster} alt={`${title.title} poster`} width={84} height={126} sizes="84px" /> : <Clapperboard size={24} />}</div><div><span className={s.topRank}>{String(index + 1).padStart(2, '0')} <i />{statsKinds[title.kind]}</span><h3>{title.title}</h3><p><Star size={13} fill="currentColor" />{title.rating}<small>/10 · your score</small></p></div><ArrowUpRight className={s.topArrow} size={17} /></Link>
        })}</div> : <div className={s.emptyRatings}><Star size={27} /><div><h3>Your favourites deserve the spotlight.</h3><p>Add your own ratings in My Library. Your top six will appear here.</p></div><Link href="/library">Rate a story <ArrowUpRight size={15} /></Link></div>}
      </section>
      <footer className={s.explanation}><LockKeyhole size={15} /><div><p>For your eyes only.</p><span>Based on your current library, completion dates and manual episode marks. Removing or changing a record updates these totals. These are library milestones, not measured playback hours.</span><small>Monthly dates use {stats.timezone}. Updated {new Date(stats.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</small></div></footer>
    </motion.div>}
  </>
}

function StatsSkeleton() { return <div className={s.skeleton} aria-busy="true" aria-label="Loading your private statistics"><div className={s.kpis}>{[0, 1, 2, 3].map(i => <span key={i} />)}</div><div className={s.mainGrid}><span /><span /></div><p>Gathering your stories…</p></div> }

export default function PersonalStats() {
  const { user, profile, loading, error, refresh } = useAccount()
  return <Shell><div className={s.page} data-personal-stats="">
    <Link className={s.back} href="/profile"><ArrowLeft size={14} /> Back to profile</Link>
    <header className={s.hero}><div><p className={s.kicker}><i />YOUR VIEWING JOURNAL</p><h1>Your stories,<br />in numbers<span>.</span></h1><p>Every saved story. Every finished chapter.<br />A little perspective on your own corner of Vantra.</p></div><div className={s.heroAside}><Avatar large /><span>{profile?.display_name || 'Your private space'}</span><p><LockKeyhole size={11} /> Only visible to you</p><BarChart3 className={s.heroMark} size={160} strokeWidth={.5} aria-hidden="true" /></div></header>
    {loading ? <StatsSkeleton /> : !user ? <ErrorPanel title="Your story is private." message={error || 'Sign in to see your personal statistics.'} retry={error ? () => { void refresh() } : undefined} /> : <Dashboard key={user.id} userId={user.id} />}
    {!loading && !user && !error && <Link className={s.signIn} href="/login">Sign in <ArrowUpRight size={14} /></Link>}
  </div></Shell>
}
