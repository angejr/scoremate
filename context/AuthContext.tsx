// ============================================
// context/AuthContext.tsx - Authentication Context
// ============================================

import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase.config';
import { User } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  partnerData: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  partnerData: null,
  loading: true,
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [partnerData, setPartnerData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Setting up auth listener...');
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('[AuthContext] Timeout reached, setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser?.email || 'No user');
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setUserData(null);
        setPartnerData(null);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      // Try to fetch user data from Firestore
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const userDataObj: User = {
            id: firebaseUser.uid,
            email: data.email || firebaseUser.email || '',
            name: data.name || '',
            partnerId: data.partnerId || null,
            isPremium: data.isPremium || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            currentWeekScore: data.currentWeekScore || 0,
            premiumPurchaseDate: data.premiumPurchaseDate?.toDate(),
            customTriggers: data.customTriggers || [],
            customDeeds: data.customDeeds || [],
            selectedTriggerIds: data.selectedTriggerIds,
            selectedDeedIds: data.selectedDeedIds,
          };
          setUserData(userDataObj);

          // Fetch partner data if partnerId exists
          if (data.partnerId) {
            try {
              const partnerDoc = await getDoc(doc(db, 'users', data.partnerId));
              if (partnerDoc.exists()) {
                const partnerDocData = partnerDoc.data();
                setPartnerData({
                  id: data.partnerId,
                  email: partnerDocData.email || '',
                  name: partnerDocData.name || '',
                  partnerId: partnerDocData.partnerId || null,
                  isPremium: partnerDocData.isPremium || false,
                  createdAt: partnerDocData.createdAt?.toDate() || new Date(),
                  currentWeekScore: partnerDocData.currentWeekScore || 0,
                  customTriggers: partnerDocData.customTriggers || [],
                  customDeeds: partnerDocData.customDeeds || [],
                });
              }
            } catch (error) {
              console.error('[AuthContext] Error fetching partner data:', error);
            }
          } else {
            setPartnerData(null);
          }
        } else {
          console.log('[AuthContext] User document does not exist yet');
          // User is authenticated but no Firestore document exists
          // This happens after first signup - the user just needs to have their doc created
          setUserData(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error fetching user data:', error);
      }
      
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribeAuth();
      clearTimeout(timeout);
    };
  }, []);

  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          id: user.uid,
          email: data.email || user.email || '',
          name: data.name || '',
          partnerId: data.partnerId || null,
          isPremium: data.isPremium || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          currentWeekScore: data.currentWeekScore || 0,
          customTriggers: data.customTriggers || [],
          customDeeds: data.customDeeds || [],
        });

        if (data.partnerId) {
          const partnerDoc = await getDoc(doc(db, 'users', data.partnerId));
          if (partnerDoc.exists()) {
            const partnerDocData = partnerDoc.data();
            setPartnerData({
              id: data.partnerId,
              email: partnerDocData.email || '',
              name: partnerDocData.name || '',
              partnerId: partnerDocData.partnerId || null,
              isPremium: partnerDocData.isPremium || false,
              createdAt: partnerDocData.createdAt?.toDate() || new Date(),
              currentWeekScore: partnerDocData.currentWeekScore || 0,
            });
          }
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, partnerData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}
