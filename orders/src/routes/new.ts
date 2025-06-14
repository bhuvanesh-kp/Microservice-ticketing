import express, { Request, Response } from "express";
import { BadRequestError, RequireAuth, validateRequest } from "@my-micro-service/common";
import { body } from "express-validator";
import mongoose from "mongoose";
import { Ticket } from "../models/ticket";
import { Order } from "../models/orders";
import { NotFoundError, OrderStatus } from "@my-micro-service/common";
import { OrderCreatedEvent } from "@my-micro-service/common";
import { natsWrapper } from "../nats-wrapper";
import { OrderCreatedPublisher } from "../events/publishers/order-created-publisher";


const router = express.Router();
const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post('/api/orders',
    RequireAuth,
    [
        body('ticketId')
            .not()
            .isEmpty()
            .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
            .withMessage('TicketId must be provided')
    ],
    validateRequest,
    async (req: Request, res: Response) => {
        const { ticketId } = req.body;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            throw new NotFoundError();
        }

        const isReserved = await ticket.isReserved();
        if (isReserved) {
            throw new BadRequestError("TIcket already reserved");
        }

        const expiration = new Date();
        expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS);

        const order = Order.build({
            userId: req.currentUser!.id,
            status: OrderStatus.Created,
            expiresAt: expiration,
            ticket
        });

        await order.save();

        new OrderCreatedPublisher(natsWrapper.client).publish({
            id: order.id,
            version: order.version,
            status: order.status,
            userId: order.userId,
            expiresAt: order.expiresAt.toISOString(),
            ticket: {
                id: ticket.id,
                price: ticket.price,
            },
        });

        res.status(201).send(order);
    });

export { router as newOrderRouter };