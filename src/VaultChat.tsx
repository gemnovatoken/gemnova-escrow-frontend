import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

interface Message {
  id: string;
  sender_wallet: string;
  message: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
}

interface VaultChatProps {
  contractId: string;
  currentUserWallet: string;
  status: string; // 👈 NUEVO: Recibimos el estatus del contrato
}

export const VaultChat = ({ contractId, currentUserWallet, status }: VaultChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (data && !error) setMessages(data);
    };

    fetchMessages();

    const subscription = supabase
      .channel(`chat-${contractId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `contract_id=eq.${contractId}` },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [contractId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserWallet || status === 'PENDING') return; // Bloquea envío si está pendiente

    const textToSend = newMessage;
    setNewMessage(''); 

    await supabase.from('messages').insert([{
      contract_id: contractId,
      sender_wallet: currentUserWallet,
      message: textToSend
    }]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserWallet || status === 'PENDING') return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${contractId}/${fileName}`; 

      const { error: uploadError } = await supabase.storage.from('vault-files').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('vault-files').getPublicUrl(filePath);

      await supabase.from('messages').insert([{
        contract_id: contractId,
        sender_wallet: currentUserWallet,
        message: '📎 Sent an encrypted attachment.',
        file_url: urlData.publicUrl,
        file_name: file.name
      }]);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file.");
    } finally {
      setIsUploading(false);
    }
  };

  const isLocked = status === 'PENDING';

  return (
    <div style={{ backgroundColor: '#0a0a0a', border: isLocked ? '1px solid #444' : '1px solid #2ecc71', borderRadius: '15px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '500px', marginTop: '30px', boxShadow: isLocked ? 'none' : '0 10px 30px rgba(46, 204, 113, 0.1)', position: 'relative' }}>
      
      {/* 🔒 PANTALLA DE BLOQUEO (Tu idea implementada) */}
      {isLocked && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '4rem', marginBottom: '15px' }}>🔒</span>
          <h2 style={{ color: '#FFD700', margin: '0 0 10px 0' }}>Chat is Locked</h2>
          <p style={{ color: '#ccc', fontSize: '1rem', maxWidth: '80%' }}>
            For your security, the chat and file sharing will unlock automatically as soon as the funds are secured in the Vault.
          </p>
        </div>
      )}

      {/* Cabecera del Chat */}
      <div style={{ backgroundColor: '#111', padding: '15px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: isLocked ? '#666' : '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💬 Secure Vault Chat
        </h3>
        <span style={{ fontSize: '0.7rem', color: isLocked ? '#444' : '#888', backgroundColor: '#222', padding: '4px 8px', borderRadius: '6px' }}>
          E2E Encrypted
        </span>
      </div>

      {/* Área de Mensajes */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', margin: 'auto', fontStyle: 'italic' }}>
            No messages yet. Say hello and finalize your deal details here.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_wallet === currentUserWallet;
            return (
              <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <span style={{ fontSize: '0.65rem', color: '#666', marginBottom: '4px', display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                  {isMe ? 'You' : msg.sender_wallet.slice(0, 6) + '...'}
                </span>
                <div style={{ backgroundColor: isMe ? '#004422' : '#222', color: '#fff', padding: '12px 16px', borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0', border: isMe ? '1px solid #2ecc71' : '1px solid #444' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', wordBreak: 'break-word' }}>{msg.message}</p>
                  {msg.file_url && (
                    <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', textDecoration: 'none', color: '#00ffcc', fontSize: '0.85rem', border: '1px dashed #00ffcc' }}>
                      📥 Download: {msg.file_name}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Envío */}
      <div style={{ backgroundColor: '#111', padding: '15px', borderTop: '1px solid #222' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          <input type="file" id="file-upload" onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg,.zip" disabled={isLocked} />
          <label htmlFor="file-upload" style={{ backgroundColor: '#222', border: '1px solid #444', color: isLocked ? '#444' : '#FFD700', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', cursor: isLocked ? 'not-allowed' : (isUploading ? 'wait' : 'pointer'), fontWeight: 'bold' }}>
            {isUploading ? '⌛' : '📎'}
          </label>
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isLocked ? "Chat locked until funds are secured..." : "Type your message..."}
            disabled={!currentUserWallet || isLocked}
            style={{ flex: 1, backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px 15px', borderRadius: '10px', outline: 'none' }}
          />
          <button type="submit" disabled={!newMessage.trim() || !currentUserWallet || isLocked} style={{ backgroundColor: isLocked ? '#333' : '#2ecc71', color: isLocked ? '#666' : '#000', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};