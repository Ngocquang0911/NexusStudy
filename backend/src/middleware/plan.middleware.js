import { assertPremiumUser } from '../modules/plans/plan.service.js'

export async function requirePremium(request, _response, next) {
  try {
    await assertPremiumUser(request.auth.userId)
    return next()
  } catch (error) {
    return next(error)
  }
}
