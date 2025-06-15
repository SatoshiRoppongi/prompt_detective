import { ref, reactive } from 'vue';
import { useApi } from './useApi';
import { useErrorHandler } from './useErrorHandler';

interface SystemStatus {
  activeGames: number;
  recentParticipants: number;
  completedGamesLast24h: number;
  serverStatus: string;
  timestamp: string;
}

interface ActiveGame {
  id: string;
  participantCount: number;
  pot: number;
  endTime: any;
  status: string;
  secretPrompt: string;
  createdAt: any;
  createdBy?: string;
  type?: string;
}

interface GameParticipant {
  id: string;
  walletAddress: string;
  bet: number;
  score: number;
  guessPrompt: string;
  createdAt: any;
}

export const useAdmin = () => {
  const api = useApi();
  const { handleError } = useErrorHandler();
  
  const loading = ref(false);
  const systemStatus = reactive<SystemStatus>({
    activeGames: 0,
    recentParticipants: 0,
    completedGamesLast24h: 0,
    serverStatus: 'unknown',
    timestamp: ''
  });
  
  const activeGames = ref<ActiveGame[]>([]);

  // Mock admin token for development
  // In production, this should come from Firebase Auth
  const adminToken = 'mock-admin-token';

  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchSystemStatus = async () => {
    try {
      loading.value = true;
      
      // For development, return mock data
      // In production, uncomment the API call below
      
      // const response = await api.get('/admin/status', { headers: getAuthHeaders() });
      // Object.assign(systemStatus, response);
      
      // Mock data for development
      Object.assign(systemStatus, {
        activeGames: 2,
        recentParticipants: 156,
        completedGamesLast24h: 8,
        serverStatus: 'healthy',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching system status:', error);
      handleError(error, 'system status fetch');
      
      // Fallback to error state
      Object.assign(systemStatus, {
        activeGames: 0,
        recentParticipants: 0,
        completedGamesLast24h: 0,
        serverStatus: 'error',
        timestamp: new Date().toISOString()
      });
    } finally {
      loading.value = false;
    }
  };

  const fetchActiveGames = async () => {
    try {
      loading.value = true;
      
      // For development, return mock data
      // In production, uncomment the API call below
      
      // const response = await api.get('/admin/games', { headers: getAuthHeaders() });
      // activeGames.value = response;
      
      // Mock data for development
      activeGames.value = [
        {
          id: 'demo-game-1749914056966',
          participantCount: 9,
          pot: 1.16,
          endTime: new Date(Date.now() + 3600000),
          status: 'active',
          secretPrompt: 'A red apple sitting on a wooden table with sunlight coming through a window',
          createdAt: new Date(Date.now() - 7200000),
          type: 'scheduled'
        }
      ];
      
    } catch (error) {
      console.error('Error fetching active games:', error);
      handleError(error, 'active games fetch');
      activeGames.value = [];
    } finally {
      loading.value = false;
    }
  };

  const fetchGameDetails = async (gameId: string): Promise<ActiveGame | null> => {
    try {
      loading.value = true;
      
      // For development, return mock data
      // In production, uncomment the API call below
      
      // const response = await api.get(`/admin/games/${gameId}`, { headers: getAuthHeaders() });
      // return response;
      
      // Mock data for development
      const mockParticipants: GameParticipant[] = [
        {
          id: '1',
          walletAddress: 'GLcDQyrP9LurDBnf7rFjS9N9tXWraDb3Djsmns3MJoeD',
          bet: 0.15,
          score: 85.5,
          guessPrompt: 'A red apple on a table',
          createdAt: new Date()
        },
        {
          id: '2',
          walletAddress: '6dNVeACdySTuXnuBVgNkJMAhHNs2kBZZDzFr8bSx1234',
          bet: 0.30,
          score: 92.1,
          guessPrompt: 'Red apple sitting on wooden table with sunlight',
          createdAt: new Date()
        }
      ];

      return {
        id: gameId,
        participantCount: mockParticipants.length,
        pot: mockParticipants.reduce((sum, p) => sum + p.bet, 0),
        endTime: new Date(Date.now() + 3600000),
        status: 'active',
        secretPrompt: 'A red apple sitting on a wooden table with sunlight coming through a window',
        createdAt: new Date(Date.now() - 7200000),
        participants: mockParticipants
      } as any;
      
    } catch (error) {
      console.error('Error fetching game details:', error);
      handleError(error, 'game details fetch');
      return null;
    } finally {
      loading.value = false;
    }
  };

  const forceEndGame = async (gameId: string, reason: string): Promise<boolean> => {
    try {
      loading.value = true;
      
      // For development, simulate success
      // In production, uncomment the API call below
      
      // const response = await api.post('/admin/games/end', {
      //   gameId,
      //   reason
      // }, { headers: getAuthHeaders() });
      
      console.log(`Force ending game ${gameId} with reason: ${reason}`);
      
      // Update local state
      const gameIndex = activeGames.value.findIndex(g => g.id === gameId);
      if (gameIndex >= 0) {
        activeGames.value[gameIndex].status = 'force-ended';
      }
      
      return true;
      
    } catch (error) {
      console.error('Error force ending game:', error);
      handleError(error, 'force end game');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const extendGame = async (gameId: string, extensionMinutes: number): Promise<boolean> => {
    try {
      loading.value = true;
      
      // For development, simulate success
      // In production, uncomment the API call below
      
      // const response = await api.post('/admin/games/extend', {
      //   gameId,
      //   extensionMinutes
      // }, { headers: getAuthHeaders() });
      
      console.log(`Extending game ${gameId} by ${extensionMinutes} minutes`);
      
      // Update local state
      const gameIndex = activeGames.value.findIndex(g => g.id === gameId);
      if (gameIndex >= 0) {
        const currentEndTime = new Date(activeGames.value[gameIndex].endTime);
        const newEndTime = new Date(currentEndTime.getTime() + extensionMinutes * 60 * 1000);
        activeGames.value[gameIndex].endTime = newEndTime;
      }
      
      return true;
      
    } catch (error) {
      console.error('Error extending game:', error);
      handleError(error, 'extend game');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const createEmergencyGame = async (secretPrompt: string, imageName: string, duration: number): Promise<boolean> => {
    try {
      loading.value = true;
      
      // For development, simulate success
      // In production, uncomment the API call below
      
      // const response = await api.post('/admin/games/emergency', {
      //   secretPrompt,
      //   imageName,
      //   duration
      // }, { headers: getAuthHeaders() });
      
      console.log(`Creating emergency game with prompt: ${secretPrompt}`);
      
      // Add to local state
      const newGame: ActiveGame = {
        id: `emergency-${Date.now()}`,
        participantCount: 0,
        pot: 0,
        endTime: new Date(Date.now() + duration * 60 * 1000),
        status: 'active',
        secretPrompt,
        createdAt: new Date(),
        type: 'emergency'
      };
      
      activeGames.value.unshift(newGame);
      systemStatus.activeGames += 1;
      
      return true;
      
    } catch (error) {
      console.error('Error creating emergency game:', error);
      handleError(error, 'create emergency game');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchSystemStatus(),
      fetchActiveGames()
    ]);
  };

  return {
    // State
    loading: readonly(loading),
    systemStatus: readonly(systemStatus),
    activeGames: readonly(activeGames),
    
    // Methods
    fetchSystemStatus,
    fetchActiveGames,
    fetchGameDetails,
    forceEndGame,
    extendGame,
    createEmergencyGame,
    refreshData
  };
};