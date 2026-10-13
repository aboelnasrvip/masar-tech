import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Profile', 'Course', 'Lesson', 'Payment', 'Student', 'Assignment', 'Chat', 'Settings', 'Security', 'Live', 'Exam'],
  endpoints: () => ({}),
})
