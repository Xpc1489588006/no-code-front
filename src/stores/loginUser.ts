import { defineStore } from 'pinia'
import { getLoginUser } from '@/api/userController'

const initialLoginUser = (): API.LoginUserVO => ({
  id: 0,
  userName: 'Guest',
  userRole: 'guest',
})

export const useLoginUserStore = defineStore('loginUser', {
  state: () => ({
    loginUser: initialLoginUser() as API.LoginUserVO,
  }),
  actions: {
    async fetchLoginUser() {
      try {
        const res = await getLoginUser()
        if (res.data.code === 0 && res.data.data) {
          this.loginUser = res.data.data
          return res.data.data
        }
      } catch (error) {
        console.error('fetch login user failed', error)
      }
      this.loginUser = initialLoginUser()
      return this.loginUser
    },
    setLoginUser(loginUser: API.LoginUserVO) {
      this.loginUser = loginUser
    },
    clearLoginUser() {
      this.loginUser = initialLoginUser()
    },
  },
})
