import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createGroup, reset } from "../../redux/slices/groupSlice";
import { motion, AnimatePresence } from "framer-motion";
import { X, Map, Home, Heart, Users, Loader2 } from "lucide-react";
import { Button } from "../common/Button";

const categories = [
  { id: 'Trip', icon: Map, color: 'text-blue-400' },
  { id: 'Home', icon: Home, color: 'text-green-400' },
  { id: 'Couple', icon: Heart, color: 'text-pink-400' },
  { id: 'Other', icon: Users, color: 'text-purple-400' },
];

export const CreateGroupModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Other",
  });

  const dispatch = useDispatch();
  const { isLoading, isSuccess, isError, message } = useSelector(
    (state) => state.groups
  );

  useEffect(() => {
    if (isSuccess && isOpen) {
      onClose();
      dispatch(reset());
      setFormData({ name: "", description: "", category: "Other" });
    }
  }, [isSuccess, isOpen, onClose, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    dispatch(createGroup(formData));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-2xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface-container-low border border-on-surface-variant/10 rounded-[2.5rem] p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-manrope font-bold text-primary tracking-tight">Initialize Pipeline</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-on-surface-variant/60 ml-1">
                  Entity Name
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Tokyo Expedition 2024"
                  className="w-full bg-surface-container-highest/30 border border-on-surface-variant/5 focus:border-primary/20 rounded-2xl px-6 py-4 outline-none text-primary transition-all font-medium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-on-surface-variant/60 ml-1">
                  Project Domain
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                        formData.category === cat.id 
                          ? 'bg-primary border-primary text-background' 
                          : 'bg-surface-container-highest/20 border-on-surface-variant/5 text-on-surface-variant/60 hover:border-on-surface-variant/20'
                      }`}
                    >
                      <cat.icon size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{cat.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-on-surface-variant/60 ml-1">
                  Operational Scope (Optional)
                </label>
                <textarea
                  placeholder="Describe the settlement pipeline..."
                  rows="3"
                  className="w-full bg-surface-container-highest/30 border border-on-surface-variant/5 focus:border-primary/20 rounded-2xl px-6 py-4 outline-none text-primary transition-all font-medium resize-none text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {isError && (
                <div className="p-4 bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-widest rounded-xl text-center">
                  {message}
                </div>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full py-5 rounded-2xl flex justify-center items-center gap-3 relative overflow-hidden group"
                disabled={isLoading || !formData.name}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span className="uppercase tracking-[0.3em] font-bold text-xs">Establish Network</span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
