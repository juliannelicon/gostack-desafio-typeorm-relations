import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const listProducts = await this.productsRepository.findAllById(products);

    const serializedProducts = products.map(product => {
      const prod = listProducts.find(p => {
        return p.id === product.id;
      });

      if (!prod) {
        throw new AppError('Product not found');
      }

      if (product.quantity > prod.quantity) {
        throw new AppError('Quantity of product does not exist');
      }

      return {
        product_id: prod.id,
        price: prod.price,
        quantity: product.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: serializedProducts,
    });

    const updateProductsQuantity = listProducts.map(product => ({
      id: product.id,
      quantity:
        product.quantity -
        products.filter(p => p.id === product.id)[0].quantity,
    }));

    await this.productsRepository.updateQuantity(updateProductsQuantity);

    return order;
  }
}

export default CreateOrderService;
