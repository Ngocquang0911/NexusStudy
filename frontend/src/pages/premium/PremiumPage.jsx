import { useEffect, useState } from 'react'
import { Check, Crown, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { getPremiumRequest, submitPremiumRequest } from '../../services/premiumService.js'
import './premium.css'

const plans = [
  { id: 'MONTHLY', title: '1 tháng', price: '39.000', description: 'Linh hoạt theo tháng' },
  { id: 'SIX_MONTHS', title: '6 tháng', price: '150.000', description: 'Trung bình 25.000đ / tháng', badge: 'Tiết kiệm hơn' },
  { id: 'YEARLY', title: '1 năm', price: '289.000', description: 'Trung bình khoảng 24.083đ / tháng', badge: 'Giá tốt nhất' },
]
export default function PremiumPage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState('SIX_MONTHS')
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getPremiumRequest().then(({ data }) => { if (active) { setRequest(data.data); setReady(true) } }).catch(() => { if (active) setError('Không thể tải trạng thái đăng ký. Vui lòng thử lại sau.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  async function submit() {
    setSaving(true); setError('')
    try { const { data } = await submitPremiumRequest(selected); setRequest(data.data) }
    catch (err) { setError(err.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.') }
    finally { setSaving(false) }
  }
  const pending = request?.status === 'PENDING'
  const premium = user?.subscriptionPlan === 'PREMIUM'
  return <div className="premium-page"><header className="premium-hero"><div><span className="premium-kicker"><Sparkles size={14} /> NEXUS STUDY PREMIUM</span><h1>Nâng cấp không gian học tập của bạn</h1><p>Chọn thời hạn phù hợp để mở rộng khả năng cộng tác cùng nhóm.</p></div><div className="premium-hero-icon"><Crown size={42} /></div></header>
    <div className="premium-layout"><section className="premium-plans"><div className="premium-heading"><span className="eyebrow">CHỌN GÓI</span><h2>Một lựa chọn phù hợp cho bạn</h2><p>Giá hiển thị cho một tài khoản, bằng đồng Việt Nam.</p></div><div className="premium-plan-grid">{plans.map((plan) => <button type="button" key={plan.id} className={`premium-plan ${selected === plan.id ? 'selected' : ''}`} onClick={() => setSelected(plan.id)} aria-pressed={selected === plan.id}><span className="premium-plan-top"><strong>{plan.title}</strong>{plan.badge && <small>{plan.badge}</small>}</span><span className="premium-price">{plan.price}<small>đ</small></span><span className="premium-plan-desc">{plan.description}</span><span className="premium-plan-choice">{selected === plan.id ? 'Đã chọn' : 'Chọn gói'} <Check size={15} /></span></button>)}</div>
      <div className="premium-notice"><ShieldCheck size={19} /><div><strong>Đăng ký yêu cầu nâng cấp</strong><p>Hệ thống chưa tích hợp thanh toán. Gửi yêu cầu không phát sinh thanh toán và không tự kích hoạt Premium; quản trị viên sẽ xem xét thủ công.</p></div></div>
      {loading ? <p role="status">Đang tải trạng thái...</p> : premium ? <p className="premium-success" role="status">Tài khoản của bạn hiện đang dùng Premium.</p> : pending ? <p className="premium-success" role="status">Yêu cầu gói {plans.find((plan) => plan.id === request.plan)?.title} đang chờ quản trị viên xem xét.</p> : <button className="premium-submit" type="button" disabled={saving || !ready} onClick={submit}>{saving ? 'Đang gửi...' : 'Gửi yêu cầu đăng ký'} <ArrowRight size={16} /></button>}
      {request?.status === 'REVIEWED' && !premium && <p className="premium-reviewed">Yêu cầu trước đã được đánh dấu xem xét. Bạn có thể gửi yêu cầu mới nếu cần.</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section><aside className="premium-benefits"><span className="premium-benefit-icon"><Crown size={22} /></span><h2>Thêm không gian để cùng tiến bộ</h2><p>Quyền lợi Premium được áp dụng theo tài khoản và gói của chủ workspace.</p><ul><li><Check size={16} /> Tham gia không giới hạn workspace</li><li><Check size={16} /> Ghim tối đa 50 tin nhắn</li><li><Check size={16} /> Lưu tài liệu lâu hơn</li><li><Check size={16} /> Tùy chỉnh lịch nhắc task</li><li><Check size={16} /> Truy cập báo cáo đóng góp</li></ul><small>Thời hạn và gia hạn chưa được quản lý tự động.</small></aside></div></div>
}
