import {
    createContext,
    ReactNode,
    useContext,
    useState,
    useEffect,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem("@RocketShoes:cart");

        if (storagedCart) {
            return JSON.parse(storagedCart);
        }

        return [];
    });

    useEffect(() => {
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }, [cart]);

    const addProduct = async (productId: number) => {
        try {
            const stock = await api.get(`stock/${productId}`);
            const productAlreadyInCart = cart.find(
                (product) => product.id === productId
            );

            if (productAlreadyInCart) {
                if (productAlreadyInCart.amount + 1 > stock.data.amount) {
                    toast.error("Quantidade solicitada fora de estoque");
                    return;
                } else {
                    setCart((prevCartState) =>
                        prevCartState.map((product) => {
                            if (product.id === productId) {
                                return {
                                    ...product,
                                    amount: (product.amount += 1),
                                };
                            } else {
                                return product;
                            }
                        })
                    );
                }
            } else {
                const product = await api.get(`products/${productId}`);
                setCart((prevCartState) => {
                    return [...prevCartState, { ...product.data, amount: 1 }];
                });
            }
        } catch {
            toast.error("Erro na adição do produto");
        }
    };

    const removeProduct = (productId: number) => {
        try {
            setCart((prevCartState) =>
                prevCartState.filter((product) => {
                    return product.id !== productId;
                })
            );
        } catch {
            toast.error("Erro na remoção do produto");
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            if (amount <= 0) {
                return;
            }

            const updatedCart = [...cart];
            const stock = await api.get(`stock/${productId}`);
            const productInCart = updatedCart.find(
                (product) => product.id === productId
            );

            if (amount > stock.data.amount) {
                toast.error("Quantidade solicitada fora de estoque");
                return;
            } else if (productInCart) {
                setCart((prevCartState) =>
                    prevCartState.map((product) => {
                        if (product.id === productId) {
                            return {
                                ...product,
                                amount: amount,
                            };
                        } else {
                            return product;
                        }
                    })
                );
            }
        } catch {
            toast.error("Erro na alteração de quantidade do produto");
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
