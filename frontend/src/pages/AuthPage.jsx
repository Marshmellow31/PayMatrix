import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { register, login, reset } from "../redux/slices/authSlice";
import { Button, Input, Card } from "../components/common";

export const AuthPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLogin, setIsLogin] = useState(true);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      // Toast notification would go here
      console.error(message);
    }

    if (isSuccess || user) {
      navigate("/dashboard");
    }

    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (isLogin) {
      dispatch(login({ email: formData.email, password: formData.password }));
    } else {
      dispatch(register({ name: formData.name, email: formData.email, password: formData.password }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background overflow-hidden relative">
      {/* Decorative Premium Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-12 space-y-2">
          <h1 className="text-4xl tracking-tight text-primary uppercase">
            PayMatrix
          </h1>
          <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] font-medium opacity-60">
            {isLogin ? "Digital Debt Settlement" : "Join the Obsidian Network"}
          </p>
        </div>

        <Card className="glass-panel ghost-border p-8 shadow-2xl">
          <form onSubmit={onSubmit}>
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <Input 
                      label="Email Address" 
                      name="email"
                      value={formData.email}
                      onChange={onChange}
                      placeholder="alex@obsidian.com" 
                      required
                    />
                    <Input 
                      label="Password" 
                      name="password"
                      type="password" 
                      value={formData.password}
                      onChange={onChange}
                      placeholder="••••••••" 
                      required
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-4 pt-2">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Authenticating..." : "Initialize Session"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      type="button"
                      className="w-full text-[10px] uppercase tracking-widest font-bold opacity-60"
                      onClick={() => setIsLogin(false)}
                    >
                      New Member? Register Access
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <Input 
                      label="Full Name" 
                      name="name"
                      value={formData.name}
                      onChange={onChange}
                      placeholder="Alex Sterling" 
                      required
                    />
                    <Input 
                      label="Email Address" 
                      name="email"
                      value={formData.email}
                      onChange={onChange}
                      placeholder="alex@obsidian.com" 
                      required
                    />
                    <Input 
                      label="Secure Password" 
                      name="password"
                      type="password" 
                      value={formData.password}
                      onChange={onChange}
                      placeholder="••••••••" 
                      required
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-4 pt-2">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                       {isLoading ? "Creating Identity..." : "Create Identity"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      type="button"
                      className="w-full text-[10px] uppercase tracking-widest font-bold opacity-60"
                      onClick={() => setIsLogin(true)}
                    >
                      Existing Pilot? Access Obsidian
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
          {isError && (
             <p className="mt-4 text-[10px] text-error text-center uppercase tracking-widest font-bold">
               {message}
             </p>
          )}
        </Card>

        {/* Footnote matching "Editorial Authority" principle */}
        <div className="mt-12 text-center">
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-[0.3em] font-medium leading-loose">
                Ver. 1.0.0 // The Digital Obsidian // Secure Node Enabled
            </span>
        </div>
      </motion.div>
    </div>
  );
};
