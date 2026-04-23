// client/src/components/Chatbot.js
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! I am your Election AI Assistant. Ask me how to vote or about the candidates!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await axios.post('http://localhost:5000/api/chat', { userMessage: userMessage.text });
      setMessages((prev) => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { sender: 'bot', text: "Sorry, I'm having trouble connecting to the server." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={styles.chatbotContainer}>
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <span style={{ fontWeight: 'bold' }}>🤖 Election Assistant</span>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>✖</button>
          </div>

          <div style={styles.messageArea}>
            {messages.map((msg, index) => (
              <div key={index} style={msg.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper}>
                <div style={msg.sender === 'user' ? styles.userBubble : styles.botBubble}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={styles.botMessageWrapper}>
                <div style={styles.botBubble}><i>Typing...</i></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={styles.inputArea}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..." style={styles.inputField} />
            <button type="submit" style={styles.sendBtn}>Send</button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={styles.floatingButton}>💬</button>
      )}
    </div>
  );
}

const styles = {
  chatbotContainer: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 },
  floatingButton: { backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '50%', width: '60px', height: '60px', fontSize: '30px', cursor: 'pointer', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' },
  chatWindow: { backgroundColor: 'white', width: '320px', height: '450px', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { backgroundColor: '#007bff', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' },
  messageArea: { flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '10px' },
  userMessageWrapper: { display: 'flex', justifyContent: 'flex-end' },
  botMessageWrapper: { display: 'flex', justifyContent: 'flex-start' },
  userBubble: { backgroundColor: '#007bff', color: 'white', padding: '10px 14px', borderRadius: '18px 18px 0px 18px', maxWidth: '80%', fontSize: '14px' },
  botBubble: { backgroundColor: '#e9ecef', color: '#333', padding: '10px 14px', borderRadius: '18px 18px 18px 0px', maxWidth: '80%', fontSize: '14px' },
  inputArea: { display: 'flex', padding: '10px', borderTop: '1px solid #ddd', backgroundColor: 'white' },
  inputField: { flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '20px', outline: 'none' },
  sendBtn: { marginLeft: '10px', padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Chatbot;