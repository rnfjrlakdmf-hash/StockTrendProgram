import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { motion } from "framer-motion";
import { MessageSquare, ThumbsUp, Eye, Image as ImageIcon, Send, Loader2, ArrowLeft, Crown, Sparkles } from "lucide-react";

interface User {
    id: string;
    name: string;
    points?: number;
}

interface BlogPost {
    id: number;
    user_id: string;
    user_name: string;
    title: string;
    image_url?: string;
    views: number;
    likes: number;
    created_at: string;
    points?: number;
}

interface BlogComment {
    id: number;
    user_id: string;
    user_name: string;
    content: string;
    created_at: string;
    points?: number;
}

interface BlogTabProps {
    user: User | null;
}

export function BlogTab({ user }: BlogTabProps) {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [hotPosts, setHotPosts] = useState<BlogPost[]>([]);
    const [view, setView] = useState<'list' | 'write' | 'detail'>('list');
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [postDetailContent, setPostDetailContent] = useState("");
    
    const [titleInput, setTitleInput] = useState("");
    const [contentInput, setContentInput] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    
    const [commentInput, setCommentInput] = useState("");
    const [commentSending, setCommentSending] = useState(false);

    useEffect(() => {
        if (view === 'list') {
            fetchPosts();
            fetchHotPosts();
        }
    }, [view]);

    const fetchPosts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/posts?sort=newest`);
            const json = await res.json();
            if (json.status === "success") setPosts(json.data);
        } catch (e) { console.error(e); }
    };
    
    const fetchHotPosts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/posts?sort=popular`);
            const json = await res.json();
            if (json.status === "success") {
                // 상위 3개만 명예의 전당으로
                setHotPosts(json.data.slice(0, 3));
            }
        } catch (e) { console.error(e); }
    };

    const fetchPostDetail = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/posts/${id}`);
            const json = await res.json();
            if (json.status === "success") {
                setSelectedPost(json.data);
                setPostDetailContent(json.data.content);
                setComments(json.data.comments || []);
                setView('detail');
            }
        } catch (e) { console.error(e); }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleCreatePost = async () => {
        if (!user) return alert("로그인이 필요합니다");
        if (!titleInput.trim() || !contentInput.trim()) return alert("제목과 내용을 입력해주세요");
        
        setSending(true);
        let imageUrl = null;
        
        if (selectedImage) {
            const formData = new FormData();
            formData.append("file", selectedImage);
            try {
                const imgRes = await fetch(`${API_BASE_URL}/api/community/upload`, { method: "POST", body: formData });
                const imgJson = await imgRes.json();
                if (imgJson.status === "success") imageUrl = imgJson.url;
                else throw new Error(imgJson.message);
            } catch (e) {
                alert("이미지 업로드 실패: " + e);
                setSending(false);
                return;
            }
        }
        
        try {
            const payload = {
                user_id: user.id,
                user_name: user.name,
                title: titleInput,
                content: contentInput,
                image_url: imageUrl
            };
            const res = await fetch(`${API_BASE_URL}/api/community/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.status === "success") {
                setTitleInput("");
                setContentInput("");
                setSelectedImage(null);
                setPreviewUrl(null);
                setView('list');
            } else {
                alert(json.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };
    
    const handleLikePost = async (id: number) => {
        if (!user) return alert("로그인이 필요합니다");
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/posts/${id}/like`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.id })
            });
            const json = await res.json();
            if (json.status === "success") {
                // Update local state
                if (selectedPost && selectedPost.id === id) {
                    setSelectedPost({...selectedPost, likes: selectedPost.likes + 1});
                }
                setPosts(prev => prev.map(p => p.id === id ? {...p, likes: p.likes + 1} : p));
                setHotPosts(prev => prev.map(p => p.id === id ? {...p, likes: p.likes + 1} : p));
            } else {
                alert(json.message);
            }
        } catch (e) { console.error(e); }
    };
    
    const handleAddComment = async () => {
        if (!user) return alert("로그인이 필요합니다");
        if (!commentInput.trim() || !selectedPost) return;
        
        setCommentSending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/community/posts/${selectedPost.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.id, user_name: user.name, content: commentInput })
            });
            const json = await res.json();
            if (json.status === "success") {
                setCommentInput("");
                // Refresh comments
                fetchPostDetail(selectedPost.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCommentSending(false);
        }
    };

    const renderNameWithBadge = (name: string, points?: number) => {
        const pts = points || 0;
        if (pts >= 100) {
            return (
                <span className="flex items-center gap-1 text-[#FFD700] font-black drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">
                    <Crown className="w-4 h-4 fill-[#FFD700]" /> {name}
                </span>
            );
        }
        if (pts >= 50) {
            return (
                <span className="flex items-center gap-1 text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                    <Sparkles className="w-3 h-3 fill-cyan-400" /> {name}
                </span>
            );
        }
        return <span className="font-bold text-gray-300">{name}</span>;
    };

    return (
        <div className="space-y-6">
            {view === 'list' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">인사이트 칼럼</h2>
                        <button onClick={() => setView('write')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold transition-colors">
                            글쓰기
                        </button>
                    </div>
                    
                    {/* 명예의 전당 */}
                    {hotPosts.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-amber-500/20 rounded-3xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Crown className="w-5 h-5 text-amber-500" />
                                <h3 className="text-lg font-bold text-amber-500">명예의 전당 베스트 글</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {hotPosts.map(post => (
                                    <div key={post.id} onClick={() => fetchPostDetail(post.id)} className="bg-black/40 border border-white/5 rounded-2xl p-4 cursor-pointer hover:border-amber-500/50 transition-colors">
                                        <h4 className="font-bold text-sm truncate">{post.title}</h4>
                                        <div className="mt-2 text-xs flex justify-between items-center text-gray-400">
                                            {renderNameWithBadge(post.user_name, post.points)}
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-pink-500"/> {post.likes}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* 게시글 목록 */}
                    <div className="space-y-3">
                        {posts.map(post => (
                            <div key={post.id} onClick={() => fetchPostDetail(post.id)} className="bg-white/5 border border-white/10 rounded-2xl p-5 cursor-pointer hover:bg-white/10 transition-colors flex gap-4 items-center">
                                {post.image_url && (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-black">
                                        <img src={`${API_BASE_URL}/uploads/${post.image_url}`} alt="thumb" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-200 truncate">{post.title}</h3>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                                        {renderNameWithBadge(post.user_name, post.points)}
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> {post.views}</span>
                                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-pink-400"/> {post.likes}</span>
                                        <span className="font-mono ml-auto">{new Date(post.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {posts.length === 0 && (
                            <div className="text-center text-gray-500 py-10">첫 번째 칼럼을 작성해보세요!</div>
                        )}
                    </div>
                </motion.div>
            )}

            {view === 'write' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                        <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <h2 className="text-xl font-bold">새 인사이트 작성</h2>
                    </div>
                    
                    <input 
                        type="text" 
                        value={titleInput} 
                        onChange={e => setTitleInput(e.target.value)}
                        placeholder="제목을 입력하세요" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-blue-500" 
                    />
                    
                    <textarea 
                        value={contentInput}
                        onChange={e => setContentInput(e.target.value)}
                        placeholder="자신만의 투자 철학이나 분석을 자유롭게 적어주세요. 우수 작성자에게는 전문 애널리스트 뱃지가 부여됩니다!"
                        className="w-full h-64 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    
                    {previewUrl && (
                        <div className="relative w-fit">
                            <img src={previewUrl} alt="Preview" className="max-h-40 rounded-xl border border-white/10" />
                            <button onClick={() => { setSelectedImage(null); setPreviewUrl(null); }} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:scale-110 transition-transform">
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                        <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-gray-300 transition-colors flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> 썸네일/사진 첨부
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                        <button onClick={handleCreatePost} disabled={sending} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                            등록하기
                        </button>
                    </div>
                </motion.div>
            )}

            {view === 'detail' && selectedPost && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('list')} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                        <h1 className="text-2xl md:text-3xl font-black text-white">{selectedPost.title}</h1>
                        <div className="flex justify-between items-center border-b border-white/10 pb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white">
                                    {selectedPost.user_name.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm">{renderNameWithBadge(selectedPost.user_name, selectedPost.points)}</div>
                                    <div className="text-xs text-gray-500 font-mono">{new Date(selectedPost.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1"><Eye className="w-4 h-4"/> {selectedPost.views}</span>
                                <span className="flex items-center gap-1 text-pink-400"><ThumbsUp className="w-4 h-4"/> {selectedPost.likes}</span>
                            </div>
                        </div>
                        
                        <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed whitespace-pre-wrap">
                            {postDetailContent}
                        </div>
                        
                        {selectedPost.image_url && (
                            <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-black">
                                <img src={`${API_BASE_URL}/uploads/${selectedPost.image_url}`} alt="Attached" className="w-full object-contain max-h-[500px]" />
                            </div>
                        )}
                        
                        <div className="pt-8 flex justify-center">
                            <button onClick={() => handleLikePost(selectedPost.id)} className="px-6 py-3 bg-white/5 hover:bg-pink-500/20 hover:border-pink-500/50 border border-white/10 rounded-full flex items-center gap-2 transition-all group">
                                <ThumbsUp className="w-5 h-5 text-gray-400 group-hover:text-pink-500 group-hover:fill-pink-500/20" />
                                <span className="font-bold text-gray-300 group-hover:text-pink-400">공감 {selectedPost.likes}</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-400" /> 댓글 {comments.length}개</h3>
                        <div className="flex gap-2">
                            <input type="text" value={commentInput} onChange={e => setCommentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} placeholder={user ? "댓글을 남겨주세요" : "로그인 후 댓글을 남길 수 있습니다"} disabled={!user || commentSending} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                            <button onClick={handleAddComment} disabled={!user || !commentInput.trim() || commentSending} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors">
                                {commentSending ? <Loader2 className="w-4 h-4 animate-spin"/> : "등록"}
                            </button>
                        </div>
                        <div className="space-y-4 mt-4">
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">
                                        {c.user_name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm">{renderNameWithBadge(c.user_name, c.points)}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">{new Date(c.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-300 mt-1">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
