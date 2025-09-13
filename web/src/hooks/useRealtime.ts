import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useRealtime = (table: string, callback: () => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          callback()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [table, callback])
}
