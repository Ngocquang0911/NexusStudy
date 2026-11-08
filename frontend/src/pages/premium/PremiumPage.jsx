import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Crown, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { getCurrentUser } from '../../services/authService.js'
import { getPremiumRequest, startPremiumPayment } from '../../services/premiumService.js'
import './premium.css'

const plans = [
  { id: 'MONTHLY', title: '1 tháng', price: '39.000', description: 'Linh hoạt theo tháng' },
  { id: 'SIX_MONTHS', title: '6 tháng', price: '150.000', description: 'Trung bình 25.000đ / tháng', badge: 'Tiết kiệm hơn' },
  { id: 'YEARLY', title: '1 năm', price: '289.000', description: 'Trung bình khoảng 24.083đ / tháng', badge: 'Giá tốt nhất' },
]

export default function PremiumPage() {
  const { user, updateUser } = useAuth()
  const [searchParams] = useSearchParams()
  const [selected, setSelected] = useState('SIX_MONTHS')
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const paymentResult = searchParams.get('payment')

  useEffect(() => {
    let active = true
    async function loadState() {
      try {
        for (let attempt = 0; attempt < (paymentResult === 'returned' ? 8 : 1); attempt += 1) {
          const [requestResponse, userResponse] = await Promise.all([getPremiumRequest(), getCurrentUser()])
          if (!active) return
          const latestRequest = requestResponse.data.data
          setRequest(latestRequest)
          updateUser(userResponse.data.data)
          setReady(true)
          if (paymentResult !== 'returned' || latestRequest?.status === 'PAID') break
          await new Promise((resolve) => window.setTimeout(resolve, 1500))
        }
      } catch { if (active) setError('Không thể tải trạng thái đăng ký. Vui lòng thử lại sau.') }
      finally { if (active) setLoading(false) }
    }
    loadState()
    return () => { active = false }
  }, [])

  async function pay() {
    setSaving(true)
    setError('')
    try {
      const { data } = await startPremiumPayment(selected)
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.data.checkoutUrl
      Object.entries(data.data.fields).forEach(([name, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = String(value)
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo giao dịch. Vui lòng thử lại.')
      setSaving(false)
    }
  }

  const premium = user?.subscriptionPlan === 'PREMIUM'
  const activePayment = request?.status === 'PENDING_PAYMENT' && new Date(request.expiresAt) > new Date()
  return <div className="premium-page"><header className="premium-hero"><div><span className="premium-kicker"><Sparkles size={14} /> NEXUS STUDY PREMIUM</span><h1>Nâng cấp không gian học tập của bạn</h1><p>Chọn thời hạn phù hợp để mở rộng khả năng cộng tác cùng nhóm.</p></div><div className="premium-hero-icon"><Crown size={42} /></div></header>
    <div className="premium-layout"><section className="premium-plans"><div className="premium-heading"><span className="eyebrow">CHỌN GÓI</span><h2>Một lựa chọn phù hợp cho bạn</h2><p>Giá hiển thị cho một tài khoản, bằng đồng Việt Nam.</p></div><div className="premium-plan-grid">{plans.map((plan) => <button type="button" key={plan.id} className={`premium-plan ${selected === plan.id ? 'selected' : ''}`} onClick={() => setSelected(plan.id)} aria-pressed={selected === plan.id}><span className="premium-plan-top"><strong>{plan.title}</strong>{plan.badge && <small>{plan.badge}</small>}</span><span className="premium-price">{plan.price}<small>đ</small></span><span className="premium-plan-desc">{plan.description}</span><span className="premium-plan-choice">{selected === plan.id ? 'Đã chọn' : 'Chọn gói'} <Check size={15} /></span></button>)}</div>
      <div className="premium-notice"><ShieldCheck size={19} /><div><strong>Thanh toán bảo mật qua SePay</strong><p>Bạn sẽ được chuyển đến cổng SePay. Premium chỉ được kích hoạt sau khi máy chủ xác minh webhook giao dịch thành công.</p></div></div>
      {paymentResult === 'returned' && request?.status === 'PAID' && <p className="premium-success" role="status">SePay đã xác nhận thanh toán. Tài khoản Premium đã được cập nhật.</p>}
      {paymentResult === 'returned' && request?.status === 'PENDING_PAYMENT' && <p className="premium-reviewed" role="status">Đang chờ SePay xác nhận giao dịch. Trạng thái sẽ tự cập nhật sau khi webhook đến.</p>}
      {paymentResult === 'cancelled' && <p className="premium-reviewed" role="status">Bạn đã hủy giao dịch. Chọn gói để thử thanh toán lại.</p>}
      {loading ? <p role="status">Đang tải trạng thái...</p> : premium ? <p className="premium-success" role="status">Tài khoản của bạn hiện đang dùng Premium{user.subscriptionExpiresAt ? ` đến ${new Date(user.subscriptionExpiresAt).toLocaleDateString('vi-VN')}` : ''}.</p> : activePayment ? <><p className="premium-reviewed" role="status">Bạn có giao dịch đang chờ thanh toán gói {plans.find((plan) => plan.id === request.plan)?.title}.</p><button className="premium-submit" type="button" disabled={saving} onClick={pay}>Tiếp tục thanh toán <ArrowRight size={16} /></button></> : <button className="premium-submit" type="button" disabled={saving || !ready} onClick={pay}>{saving ? 'Đang chuyển đến SePay...' : 'Thanh toán với SePay'} <ArrowRight size={16} /></button>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section><aside className="premium-benefits"><span className="premium-benefit-icon"><Crown size={22} /></span><h2>Thêm không gian để cùng tiến bộ</h2><p>Quyền lợi Premium được áp dụng theo tài khoản và gói của chủ workspace.</p><ul><li><Check size={16} /> Tham gia không giới hạn workspace</li><li><Check size={16} /> Ghim tối đa 50 tin nhắn</li><li><Check size={16} /> Lưu tài liệu lâu hơn</li><li><Check size={16} /> Tùy chỉnh lịch nhắc task</li><li><Check size={16} /> Truy cập báo cáo đóng góp</li></ul><small>Gói có thời hạn; khi thanh toán thêm, thời hạn mới được cộng nối tiếp.</small></aside></div></div>
}
